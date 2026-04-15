import "server-only";

import { NewsletterStats, NewsletterSubscriptionData } from "@/types";
import { TenantUser } from "@/models/TenantUser";
import { AuthUser } from "@/models/AuthUser";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { Tenant } from "@/models/Tenant";
import { AudienceContact } from "@/models/AudienceContact";
import crypto from "crypto";
import { connectToDB } from "./db/mongodb";
import { NewsletterLog } from "@/models/NewsletterLog";
import {
  sendNewsletterEmail,
  sendNewsletterVerificationEmail,
} from "./email/email";
import { Types } from "mongoose";

const trackingDomain = process.env.NEXT_PUBLIC_APP_URL;
const websiteDomain = process.env.NEXT_PUBLIC_API_URL;
const platformBaseUrl = process.env.NEXT_PUBLIC_APP_URL;

function getLandingBaseUrl(
  tenant: {
    slug: string;
    customDomain?: string | null;
    customDomainVerified?: boolean;
  } | null,
): string {
  if (tenant?.customDomain && tenant.customDomainVerified) {
    return `https://${tenant.customDomain}`;
  }
  return `${platformBaseUrl}/${tenant?.slug ?? ""}`;
}

function getNewsletterLandingUrl(
  tenant: {
    slug: string;
    customDomain?: string | null;
    customDomainVerified?: boolean;
  } | null,
  landingSlug: string,
): string {
  const cleanSlug = landingSlug.startsWith("/")
    ? landingSlug.slice(1)
    : landingSlug;
  return `${getLandingBaseUrl(tenant)}/newsletter/${cleanSlug}`;
}

export async function subscribeToNewsletter(data: NewsletterSubscriptionData) {
  await connectToDB();

  const existingContact = await AudienceContact.findOne({
    email: data.email,
    tenantId: data.tenantId ?? null,
    contactType: "NEWSLETTER",
  });

  if (existingContact?.subscribed) {
    return { success: false, message: "Već ste pretplaćeni na newsletter!" };
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const unsubscribeToken = crypto.randomBytes(32).toString("hex");

  if (existingContact) {
    existingContact.subscribed = true;
    existingContact.status = "ACTIVE";
    existingContact.verificationToken = verificationToken;
    existingContact.unsubscribeToken = unsubscribeToken;
    existingContact.unsubscribedAt = undefined;
    await existingContact.save();
  } else {
    await AudienceContact.create({
      email: data.email,
      firstName: data.name?.split(" ")[0],
      lastName: data.name?.split(" ").slice(1).join(" ") || undefined,
      tenantId: data.tenantId ?? null,
      contactType: "NEWSLETTER",
      source: "newsletter",
      subscribed: true,
      status: "ACTIVE",
      verificationToken,
      unsubscribeToken,
    });
  }

  await sendNewsletterVerificationEmail(data.email, verificationToken);

  return { success: true, message: "Verification email sent" };
}

export async function verifyNewsletterSubscription(token: string) {
  await connectToDB();

  const contact = await AudienceContact.findOne({ verificationToken: token });

  if (!contact) {
    throw new Error("Invalid token");
  }

  contact.verificationToken = undefined;
  await contact.save();

  return { success: true, message: "Subscription verified" };
}

export async function unsubscribeFromNewsletter(token: string) {
  await connectToDB();

  const contact = await AudienceContact.findOne({ unsubscribeToken: token });

  if (!contact) {
    throw new Error("Invalid token");
  }

  contact.subscribed = false;
  contact.status = "UNSUBSCRIBED";
  contact.unsubscribedAt = new Date();
  contact.unsubscribeToken = undefined;
  await contact.save();

  return { success: true, message: "Unsubscribed successfully" };
}

export async function sendCampaignEmails(campaignId: string) {
  await connectToDB();

  const campaign = await NewsletterCampaign.findById(campaignId);
  if (!campaign || campaign.status !== "sending") return;

  const tenant = await Tenant.findById(campaign.tenantId)
    .select("slug customDomain customDomainVerified")
    .lean<{
      slug: string;
      customDomain?: string | null;
      customDomainVerified?: boolean;
    }>();

  interface Recipient {
    email: string;
    name: string;
    unsubscribeToken: string;
    subscriberId: string;
  }

  let recipients: Recipient[] = [];

  if (campaign.sendToAll) {
    // Registered subscribers (TenantUser + AuthUser join)
    const tenantUsers = await TenantUser.find({
      tenantId: campaign.tenantId,
      "newsletterPreferences.subscribed": true,
      "newsletterPreferences.emailVerified": true,
    }).lean<{
      _id: Types.ObjectId;
      authUserId: Types.ObjectId;
      name: string;
      newsletterPreferences: { unsubscribeToken?: string };
    }[]>();

    for (const tu of tenantUsers) {
      const auth = await AuthUser.findById(tu.authUserId).select("email").lean<{ email: string }>();
      if (auth?.email) {
        recipients.push({
          email: auth.email,
          name: tu.name || auth.email.split("@")[0],
          unsubscribeToken: tu.newsletterPreferences?.unsubscribeToken ?? "invalid",
          subscriberId: tu._id.toString(),
        });
      }
    }

    // Anonymous AudienceContact subscribers
    const contacts = await AudienceContact.find({
      tenantId: campaign.tenantId,
      subscribed: true,
      status: "ACTIVE",
      contactType: { $in: ["NEWSLETTER", "CLIENT"] },
    }).lean<{
      _id: Types.ObjectId;
      email: string;
      firstName?: string;
      lastName?: string;
      unsubscribeToken?: string;
    }[]>();

    // Avoid duplicate emails already covered by TenantUser lookup
    const registeredEmails = new Set(recipients.map((r) => r.email));
    for (const c of contacts) {
      if (!registeredEmails.has(c.email)) {
        recipients.push({
          email: c.email,
          name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email.split("@")[0],
          unsubscribeToken: c.unsubscribeToken ?? "invalid",
          subscriberId: c._id.toString(),
        });
      }
    }
  } else if (campaign.manualRecipients && campaign.manualRecipients.length > 0) {
    recipients = campaign.manualRecipients.map((email: string) => ({
      email,
      name: email.split("@")[0],
      unsubscribeToken: "invalid",
      subscriberId: "",
    }));
  } else {
    campaign.status = "sent";
    campaign.sentCount = 0;
    await campaign.save();
    return;
  }

  let sentCount = 0;
  let bounceCount = 0;

  for (const recipient of recipients) {
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/unsubscribe?token=${recipient.unsubscribeToken}`;

    const trackingData = {
      campaignId: campaign._id.toString(),
      subscriberId: recipient.subscriberId,
    };

    let finalUrl: string;
    if (
      campaign.campaignType === "email-landing" &&
      campaign.landingPage?.slug
    ) {
      finalUrl = getNewsletterLandingUrl(tenant, campaign.landingPage.slug);
    } else {
      function normalizeSlug(slug?: string) {
        if (!slug) return "/";
        if (slug.startsWith("http")) {
          try {
            return new URL(slug).pathname;
          } catch {
            return "/";
          }
        }
        return slug.startsWith("/") ? slug : `/${slug}`;
      }
      const ctaSlug = normalizeSlug(campaign.ctaSlug);
      finalUrl = `${websiteDomain}${ctaSlug}`;
    }

    const trackingCtaUrl =
      `${trackingDomain}/api/newsletter/track/click` +
      `?campaign=${trackingData.campaignId}` +
      `&subscriber=${trackingData.subscriberId}` +
      `&url=${encodeURIComponent(finalUrl)}`;

    const personalizedContent = campaign.content
      .replace(/{{clientName}}/g, recipient.name || "poštovana")
      .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl)
      .replace(/{{trackingCtaUrl}}/g, trackingCtaUrl)
      .replace(
        /{{trackingOpenUrl}}/g,
        `${websiteDomain}/api/newsletter/track/open?campaign=${trackingData.campaignId}&subscriber=${trackingData.subscriberId}`,
      );

    try {
      await sendNewsletterEmail(
        recipient.email,
        campaign.subject,
        personalizedContent,
        unsubscribeUrl,
        trackingData,
      );

      sentCount++;
      campaign.sentCount = sentCount;
    } catch (err) {
      console.error(`Greška pri slanju na ${recipient.email}:`, err);
      bounceCount++;
      campaign.bounceCount = bounceCount;
    }
  }

  campaign.status = "sent";
  campaign.sentCount = sentCount;
  campaign.bounceCount = bounceCount;
  await campaign.save();
}

export async function trackOpen(campaignId: string, subscriberId: string) {
  await connectToDB();

  await Promise.all([
    NewsletterCampaign.findByIdAndUpdate(campaignId, {
      $inc: { openCount: 1 },
    }),
    AudienceContact.findByIdAndUpdate(subscriberId, {
      $inc: { openCount: 1 },
    }),
  ]);

  await NewsletterLog.create({
    campaignId,
    subscriberId,
    type: "open",
  });
}

export async function trackClick(
  campaignId: string,
  subscriberId: string,
  url: string,
) {
  await connectToDB();

  await Promise.all([
    NewsletterCampaign.findByIdAndUpdate(campaignId, {
      $inc: { clickCount: 1 },
    }),
    AudienceContact.findByIdAndUpdate(subscriberId, {
      $inc: { clickCount: 1 },
    }),
  ]);

  await NewsletterLog.create({
    campaignId,
    subscriberId,
    type: "click",
    url,
  });
}

export async function getNewsletterStats(): Promise<NewsletterStats> {
  await connectToDB();

  const totalSubscribers = await AudienceContact.countDocuments({
    subscribed: true,
    status: "ACTIVE",
  });

  const recentSubscribers = await AudienceContact.countDocuments({
    subscribed: true,
    status: "ACTIVE",
    createdAt: {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  const campaigns = await NewsletterCampaign.aggregate([
    {
      $group: {
        _id: null,
        totalCampaigns: { $sum: 1 },
        totalSent: { $sum: "$sentCount" },
        avgOpenRate: {
          $avg: { $multiply: [{ $divide: ["$openCount", "$sentCount"] }, 100] },
        },
        avgClickRate: {
          $avg: {
            $multiply: [{ $divide: ["$clickCount", "$sentCount"] }, 100],
          },
        },
      },
    },
  ]);

  return {
    totalSubscribers,
    activeSubscribers: 0,
    recentSubscribers,
    ...campaigns[0],
  };
}
