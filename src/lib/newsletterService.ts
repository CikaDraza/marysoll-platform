import "server-only";

import { NewsletterStats, NewsletterSubscriptionData } from "@/types";
import { User } from "@/models/User";
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

  let user = await User.findOne({ email: data.email });

  if (!user) {
    // Kreiraj novog user-a ako ne postoji (guest subscriber)
    user = new User({
      email: data.email,
      name: data.name || `Guest - ${data.email}`,
      phone: data.phone || "000000000",
      password: `Guset-${data.email}`,
      birthday: null,
      isAdmin: false,
      userType: "guest",
      isEmailVerified: false,
      agreedToPrivacy: true,
    });
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    user.newsletterPreferences = {
      subscribed: true,
      subscriptionDate: new Date(),
      subscriptionSource: data.source,
      emailVerified: false,
      verificationToken,
      unsubscribeToken,
      openCount: 0,
      clickCount: 0,
    };

    await user.save();

    // Kreiraj AudienceContact za novog newsletter pretplatnika
    try {
      await AudienceContact.findOneAndUpdate(
        { email: data.email, tenantId: null },
        {
          $setOnInsert: {
            email: data.email,
            userId: user._id,
            contactType: "NEWSLETTER",
            source: "newsletter",
            subscribed: true,
            status: "ACTIVE",
          },
        },
        { upsert: true },
      );
    } catch (contactErr) {
      console.error("⚠️ AudienceContact upsert failed (newsletter):", contactErr);
    }

    // Pošalji verifikacioni email
    await sendNewsletterVerificationEmail(data.email, verificationToken);

    return { success: true, message: "Verification email sent" };
  } else if (user.newsletterPreferences?.subscribed) {
    // Već je pretplaćen
    return { success: false, message: "Već ste pretplaćeni na newsletter!" };
  } else {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    user.newsletterPreferences = {
      subscribed: true,
      subscriptionDate: new Date(),
      subscriptionSource: data.source,
      emailVerified: false,
      verificationToken,
      unsubscribeToken,
      openCount: 0,
      clickCount: 0,
    };

    await user.save();
    return {
      success: true,
      message: "Uspešno ste se prijavili na naš newsletter!",
    };
  }
}

export async function verifyNewsletterSubscription(token: string) {
  await connectToDB();

  const user = await User.findOne({
    "newsletterPreferences.verificationToken": token,
  });

  if (!user || !user.newsletterPreferences) {
    throw new Error("Invalid token");
  }

  user.newsletterPreferences.emailVerified = true;
  user.newsletterPreferences.verifiedAt = new Date();
  user.newsletterPreferences.verificationToken = undefined;

  await user.save();

  return { success: true, message: "Subscription verified" };
}

export async function unsubscribeFromNewsletter(token: string) {
  await connectToDB();

  const user = await User.findOne({
    "newsletterPreferences.unsubscribeToken": token,
  });

  if (!user || !user.newsletterPreferences) {
    throw new Error("Invalid token");
  }

  user.newsletterPreferences.subscribed = false;
  user.newsletterPreferences.unsubscribedAt = new Date();
  user.newsletterPreferences.unsubscribeToken = undefined;

  await user.save();

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

  let recipients: string[] = [];

  if (campaign.sendToAll) {
    // Svi pretplatnici
    const subscribers = await User.find({
      $or: [
        {
          "newsletterPreferences.subscribed": true,
          "newsletterPreferences.emailVerified": true,
        },
        { "notificationSettings.newsletterPromotions": true },
        { "notificationSettings.newsletterUpdates": true },
        { "notificationSettings.newsletterTips": true },
      ],
    }).select("email name newsletterPreferences.unsubscribeToken");

    recipients = subscribers.map((s) => s.email);
  } else if (
    campaign.manualRecipients &&
    campaign.manualRecipients.length > 0
  ) {
    // Ručno odabrani
    recipients = campaign.manualRecipients;
  } else {
    campaign.status = "sent";
    campaign.sentCount = 0;
    await campaign.save();
    return;
  }

  let sentCount = 0;
  let bounceCount = 0;

  for (const email of recipients) {
    const subscriber = await User.findOne({ email });
    if (!subscriber) continue; // ako je obrisan

    const unsubscribeToken =
      subscriber.newsletterPreferences?.unsubscribeToken || "invalid";
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;

    const trackingData = {
      campaignId: campaign._id.toString(),
      subscriberId: subscriber._id.toString(),
    };

    // Generiši tracking CTA URL
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

    // Zameni varijable u contentu
    const personalizedContent = campaign.content
      .replace(/{{clientName}}/g, subscriber.name || "poštovana")
      .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl)
      .replace(/{{trackingCtaUrl}}/g, trackingCtaUrl)
      .replace(
        /{{trackingOpenUrl}}/g,
        `${websiteDomain}/api/newsletter/track/open?campaign=${trackingData.campaignId}&subscriber=${trackingData.subscriberId}`,
      );

    try {
      await sendNewsletterEmail(
        email,
        campaign.subject,
        personalizedContent,
        unsubscribeUrl,
        trackingData,
      );

      sentCount++;
      campaign.sentCount = sentCount;

      // Opcionalno: ažuriraj lastEmailSent
      if (subscriber.newsletterPreferences) {
        subscriber.newsletterPreferences.lastEmailSent = new Date();
        await subscriber.save();
      }
    } catch (err) {
      console.error(`Greška pri slanju na ${email}:`, err);
      bounceCount++;
      campaign.bounceCount = bounceCount;
    }
  }

  // Završi kampanju
  campaign.status = "sent";
  campaign.sentCount = sentCount;
  campaign.bounceCount = bounceCount;
  await campaign.save();
}

// Dodatne funkcije za tracking (open/click)
export async function trackOpen(campaignId: string, subscriberId: string) {
  await connectToDB();

  // 1. Povećaj brojače (atomično)
  await Promise.all([
    NewsletterCampaign.findByIdAndUpdate(campaignId, {
      $inc: { openCount: 1 },
    }),
    User.findByIdAndUpdate(subscriberId, {
      $inc: { "newsletterPreferences.openCount": 1 },
    }),
  ]);

  // 2. Zabeleži u logove
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

  // 1. Povećaj brojače
  await Promise.all([
    NewsletterCampaign.findByIdAndUpdate(campaignId, {
      $inc: { clickCount: 1 },
    }),
    User.findByIdAndUpdate(subscriberId, {
      $inc: { "newsletterPreferences.clickCount": 1 },
    }),
  ]);

  // 2. Zabeleži u logove sa URL-om
  await NewsletterLog.create({
    campaignId,
    subscriberId,
    type: "click",
    url,
  });
}

// Stats
export async function getNewsletterStats(): Promise<NewsletterStats> {
  await connectToDB();

  const totalSubscribers = await User.countDocuments({
    "newsletterPreferences.subscribed": true,
    "newsletterPreferences.emailVerified": true,
  });

  const recentSubscribers = await User.countDocuments({
    "newsletterPreferences.subscribed": true,
    "newsletterPreferences.emailVerified": true,
    "newsletterPreferences.subscriptionDate": {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Poslednjih 30 dana
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
