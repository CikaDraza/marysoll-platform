import "server-only";

import { NewsletterStats, NewsletterSubscriptionData } from "@/types";
import { TenantUser } from "@/models/TenantUser";
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

const platformBaseUrl =
  process.env.NEXTAUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://marysoll.com";
const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "marysoll.com";
const trackingDomain = platformBaseUrl;
const bookingBaseUrl =
  process.env.NEXT_PUBLIC_BOOKING_BASE_URL || "https://booking.marysoll.com";

function normalizeNewsletterLandingSlug(slug: string) {
  return slug
    .trim()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/^blog\/+/i, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

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
  if (tenant?.slug) {
    return `https://${tenant.slug}.${baseDomain}`;
  }
  return platformBaseUrl;
}

function getNewsletterLandingUrl(
  landingSlug: string,
): string {
  if (landingSlug.startsWith("http://") || landingSlug.startsWith("https://")) {
    return landingSlug;
  }

  const cleanSlug = normalizeNewsletterLandingSlug(landingSlug);
  return `${bookingBaseUrl.replace(/\/+$/, "")}/blog/${cleanSlug}`;
}

export async function subscribeToNewsletter(data: NewsletterSubscriptionData) {
  await connectToDB();

  const email = data.email.trim().toLowerCase();
  const tenantId = data.tenantId ?? null;
  const existingContact = await AudienceContact.findOne({
    email,
    tenantId,
  });

  const existingTenantUser = tenantId
    ? await TenantUser.findOne({ tenantId, email })
    : null;

  if (
    existingContact?.subscribed &&
    !existingContact.verificationToken &&
    (!existingTenantUser || existingTenantUser.newsletterPreferences?.subscribed)
  ) {
    return { success: false, message: "Već ste pretplaćeni na newsletter!" };
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const unsubscribeToken = crypto.randomBytes(32).toString("hex");

  if (existingContact) {
    existingContact.subscribed = true;
    existingContact.status = "ACTIVE";
    existingContact.verificationToken = verificationToken;
    existingContact.unsubscribeToken = unsubscribeToken;
    if (existingTenantUser?._id) {
      existingContact.profileId = existingTenantUser._id;
      existingContact.contactType =
        existingTenantUser.role === "USER" || existingTenantUser.role === "GUEST"
          ? "CLIENT"
          : existingTenantUser.role === "STAFF"
            ? "STAFF"
            : "SALON_OWNER";
    }
    existingContact.unsubscribedAt = undefined;
    await existingContact.save();
  } else {
    await AudienceContact.create({
      email,
      firstName: data.name?.split(" ")[0],
      lastName: data.name?.split(" ").slice(1).join(" ") || undefined,
      tenantId,
      profileId: existingTenantUser?._id,
      contactType: existingTenantUser
        ? existingTenantUser.role === "USER" || existingTenantUser.role === "GUEST"
          ? "CLIENT"
          : existingTenantUser.role === "STAFF"
            ? "STAFF"
            : "SALON_OWNER"
        : "NEWSLETTER",
      source: "newsletter",
      subscribed: true,
      status: "ACTIVE",
      verificationToken,
      unsubscribeToken,
    });
  }

  if (existingTenantUser) {
    existingTenantUser.newsletterPreferences = {
      ...existingTenantUser.newsletterPreferences,
      subscribed: true,
      subscriptionDate:
        existingTenantUser.newsletterPreferences?.subscriptionDate ?? new Date(),
      subscriptionSource: data.source ?? "footer",
      emailVerified: false,
      verificationToken,
      unsubscribeToken,
      unsubscribedAt: undefined,
      openCount: existingTenantUser.newsletterPreferences?.openCount ?? 0,
      clickCount: existingTenantUser.newsletterPreferences?.clickCount ?? 0,
    };
    await existingTenantUser.save();
  }

  await sendNewsletterVerificationEmail(email, verificationToken, tenantId);

  return { success: true, message: "Verification email sent" };
}

export async function verifyNewsletterSubscription(token: string) {
  await connectToDB();

  const contact = await AudienceContact.findOne({ verificationToken: token });

  if (!contact) {
    throw new Error("Invalid token");
  }

  contact.subscribed = true;
  contact.status = "ACTIVE";
  if (contact.tenantId) {
    await TenantUser.findOneAndUpdate(
      {
        tenantId: contact.tenantId,
        email: contact.email,
      },
      {
        $set: {
          "newsletterPreferences.subscribed": true,
          "newsletterPreferences.emailVerified": true,
          "newsletterPreferences.verifiedAt": new Date(),
          "newsletterPreferences.unsubscribeToken": contact.unsubscribeToken,
        },
        $unset: {
          "newsletterPreferences.verificationToken": "",
          "newsletterPreferences.unsubscribedAt": "",
        },
      },
    );
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
    // Registered tenant subscribers.
    const tenantUsers = await TenantUser.find({
      tenantId: campaign.tenantId,
      "newsletterPreferences.subscribed": true,
      "newsletterPreferences.emailVerified": true,
    }).lean<{
      _id: Types.ObjectId;
      email: string;
      name: string;
      newsletterPreferences: { unsubscribeToken?: string };
    }[]>();

    for (const tu of tenantUsers) {
      if (tu.email) {
        recipients.push({
          email: tu.email,
          name: tu.name || tu.email.split("@")[0],
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
      verificationToken: { $exists: false },
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
    campaign.bounceCount = 0;
    await campaign.save();
    return { sentCount: 0, bounceCount: 0, status: "sent" as const };
  }

  let sentCount = 0;
  let bounceCount = 0;

  for (const recipient of recipients) {
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/unsubscribe?token=${recipient.unsubscribeToken}`;
    const trackingPixelId = crypto.randomUUID();
    const clickTrackingId = crypto.randomUUID();

    const trackingData = {
      campaignId: campaign._id.toString(),
      subscriberId: recipient.subscriberId,
      trackingPixelId,
      clickTrackingId,
    };

    let finalUrl: string;
    if (
      campaign.campaignType === "email-landing" &&
      campaign.landingPage?.slug
    ) {
      finalUrl = getNewsletterLandingUrl(campaign.landingPage.slug);
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
      finalUrl = campaign.ctaSlug?.startsWith("http")
        ? campaign.ctaSlug
        : `${getLandingBaseUrl(tenant)}${ctaSlug}`;
    }

    const trackingCtaUrl =
      `${trackingDomain}/api/newsletter/track/click` +
      `?campaign=${trackingData.campaignId}` +
      `&subscriber=${trackingData.subscriberId}` +
      `&log=${trackingData.clickTrackingId}` +
      `&url=${encodeURIComponent(finalUrl)}`;

    const trackingOpenUrl =
      `${trackingDomain}/api/newsletter/track/open` +
      `?campaign=${trackingData.campaignId}` +
      `&subscriber=${trackingData.subscriberId}` +
      `&log=${trackingData.trackingPixelId}`;

    const newsletterLog = await NewsletterLog.create({
      tenantId: campaign.tenantId,
      campaignId: campaign._id,
      recipientEmail: recipient.email,
      ...(Types.ObjectId.isValid(recipient.subscriberId) && {
        recipientProfileId: new Types.ObjectId(recipient.subscriberId),
      }),
      status: "sent",
      trackingPixelId,
      clickTrackingId,
    });

    const personalizedContent = campaign.content
      .replace(/{{clientName}}/g, recipient.name || "poštovana")
      .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl)
      .replace(/{{trackingCtaUrl}}/g, trackingCtaUrl)
      .replace(/{{trackingOpenUrl}}/g, trackingOpenUrl);

    try {
      await sendNewsletterEmail(
        recipient.email,
        campaign.subject,
        personalizedContent,
        unsubscribeUrl,
        trackingData,
        campaign.tenantId.toString(),
      );

      sentCount++;
      campaign.sentCount = sentCount;
    } catch (err) {
      console.error(`Greška pri slanju na ${recipient.email}:`, err);
      newsletterLog.status = "bounced";
      await newsletterLog.save();
      bounceCount++;
      campaign.bounceCount = bounceCount;
    }
  }

  campaign.status = sentCount > 0 ? "sent" : "failed";
  campaign.sentCount = sentCount;
  campaign.bounceCount = bounceCount;
  await campaign.save();

  if (sentCount === 0 && bounceCount > 0) {
    throw new Error("Newsletter slanje nije uspelo: svi primaoci su odbijeni");
  }

  return {
    sentCount,
    bounceCount,
    status: campaign.status as "sent" | "failed",
  };
}

async function incrementRecipientOpen(subscriberId: string) {
  if (!Types.ObjectId.isValid(subscriberId)) return;

  await Promise.all([
    AudienceContact.findByIdAndUpdate(subscriberId, {
      $inc: { openCount: 1 },
    }),
    TenantUser.findByIdAndUpdate(subscriberId, {
      $inc: { "newsletterPreferences.openCount": 1 },
    }),
  ]);
}

async function incrementRecipientClick(subscriberId: string) {
  if (!Types.ObjectId.isValid(subscriberId)) return;

  await Promise.all([
    AudienceContact.findByIdAndUpdate(subscriberId, {
      $inc: { clickCount: 1 },
    }),
    TenantUser.findByIdAndUpdate(subscriberId, {
      $inc: { "newsletterPreferences.clickCount": 1 },
    }),
  ]);
}

async function incrementCampaignMetricOnce(
  campaignId: string,
  metric: "openCount" | "clickCount",
) {
  const campaign = await NewsletterCampaign.findOneAndUpdate(
    {
      _id: campaignId,
      $expr: { $lt: [`$${metric}`, "$sentCount"] },
    },
    {
      $inc: { [metric]: 1 },
    },
  );

  return Boolean(campaign);
}

export async function trackOpen(
  campaignId: string,
  subscriberId: string,
  trackingPixelId?: string | null,
) {
  await connectToDB();

  let logUpdated = false;

  if (trackingPixelId) {
    const updated = await NewsletterLog.findOneAndUpdate(
      {
        campaignId,
        trackingPixelId,
        openedAt: { $exists: false },
      },
      {
        $set: {
          status: "opened",
          openedAt: new Date(),
        },
      },
    );

    if (!updated) return;
    logUpdated = true;
  } else if (subscriberId) {
    const updated = await NewsletterLog.findOneAndUpdate(
      {
        campaignId,
        $or: [{ recipientProfileId: subscriberId }, { subscriberId }],
        openedAt: { $exists: false },
      },
      {
        $set: {
          status: "opened",
          openedAt: new Date(),
        },
      },
    );

    if (!updated) return;
    logUpdated = true;
  }

  if (logUpdated && (await incrementCampaignMetricOnce(campaignId, "openCount"))) {
    await incrementRecipientOpen(subscriberId);
  }
}

export async function trackClick(
  campaignId: string,
  subscriberId: string,
  url: string,
  clickTrackingId?: string | null,
) {
  await connectToDB();

  let logUpdated = false;

  if (clickTrackingId) {
    const updated = await NewsletterLog.findOneAndUpdate(
      {
        campaignId,
        clickTrackingId,
        clickedAt: { $exists: false },
      },
      {
        $set: {
          status: "clicked",
          clickedAt: new Date(),
          clickedUrl: url,
        },
      },
    );

    if (!updated) return;
    logUpdated = true;
  } else if (subscriberId) {
    const updated = await NewsletterLog.findOneAndUpdate(
      {
        campaignId,
        $or: [{ recipientProfileId: subscriberId }, { subscriberId }],
        clickedAt: { $exists: false },
      },
      {
        $set: {
          status: "clicked",
          clickedAt: new Date(),
          clickedUrl: url,
        },
      },
    );

    if (!updated) return;
    logUpdated = true;
  }

  if (
    logUpdated &&
    (await incrementCampaignMetricOnce(campaignId, "clickCount"))
  ) {
    await incrementRecipientClick(subscriberId);
  }
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
