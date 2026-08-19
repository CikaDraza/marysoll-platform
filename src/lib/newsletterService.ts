import "server-only";

import { slugify } from "@/helpers/slugify";
import { NewsletterStats, NewsletterSubscriptionData } from "@/types";
import { TenantUser } from "@/models/TenantUser";
import { NewsletterCampaign } from "@/models/NewsletterCampaign";
import { Tenant } from "@/models/Tenant";
import { AudienceContact } from "@/models/AudienceContact";
import crypto from "crypto";
import { connectToDB } from "./db/mongodb";
import { NewsletterLog } from "@/models/NewsletterLog";
import {
  normalizePlatformAudienceFilter,
  platformAudienceContactTypeCondition,
} from "@/lib/newsletter/audienceFilter";
import {
  NEWSLETTER_BATCH_SIZE,
  sendNewsletterBatch,
  sendNewsletterVerificationEmail,
} from "./email/email";
import { Types } from "mongoose";
import { platformOrigin, tenantOrigin } from "@/lib/platform/host-context";

// Origin se računa PRI POZIVU (ne pri importu) — isti kod servira prod, staging
// i dev, pa mejl mora da nosi linkove okruženja iz koga je poslat.
const bookingBaseUrl =
  process.env.NEXT_PUBLIC_BOOKING_BASE_URL || "https://booking.marysoll.com";

function normalizeNewsletterLandingSlug(slug: string) {
  const raw = slug
    .trim()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/^blog\/+/i, "");
  return slugify(raw);
}

function getLandingBaseUrl(
  tenant: {
    slug: string;
    customDomain?: string | null;
    customDomainVerified?: boolean;
  } | null,
): string {
  return tenant?.slug ? tenantOrigin(tenant) : platformOrigin();
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

function getPlatformNewsletterLandingUrl(landingSlug: string): string {
  if (landingSlug.startsWith("http://") || landingSlug.startsWith("https://")) {
    return landingSlug;
  }

  const cleanSlug = normalizeNewsletterLandingSlug(landingSlug);
  return `${platformOrigin()}/newsletter/${cleanSlug}`;
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

/**
 * Platform newsletter opt-in for a salon OWNER, performed during salon
 * registration. Creates/upgrades a PLATFORM-level (tenantId: null) AudienceContact
 * tagged SALON_OWNER. New contacts start with a verificationToken (pending) so
 * they don't receive newsletters until the owner verifies — that verification is
 * piggy-backed on the existing registration email link (no second email sent).
 * See verifyOwnerNewsletterContact().
 */
export async function upsertOwnerNewsletterContact(params: {
  email: string;
  name?: string;
  profileId?: Types.ObjectId | string;
}) {
  await connectToDB();
  const email = params.email.trim().toLowerCase();
  const nameParts = params.name?.trim().split(/\s+/).filter(Boolean) ?? [];

  await AudienceContact.findOneAndUpdate(
    { email, tenantId: null },
    {
      $set: {
        contactType: "SALON_OWNER",
        subscribed: true,
        status: "ACTIVE",
        ...(params.profileId ? { profileId: params.profileId } : {}),
      },
      $setOnInsert: {
        email,
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(" ") || undefined,
        source: "user",
        verificationToken: crypto.randomBytes(32).toString("hex"),
        unsubscribeToken: crypto.randomBytes(32).toString("hex"),
      },
    },
    { upsert: true },
  );
}

/**
 * Marks the owner's platform newsletter contact as verified by clearing its
 * pending verificationToken — called from the registration email-verification
 * route. No-op if the owner didn't opt in (no matching contact).
 */
export async function verifyOwnerNewsletterContact(email: string) {
  await connectToDB();
  await AudienceContact.updateOne(
    {
      email: email.trim().toLowerCase(),
      tenantId: null,
      contactType: "SALON_OWNER",
    },
    { $unset: { verificationToken: "" } },
  );
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

  const isPlatformCampaign = campaign.scope === "platform";
  const campaignTenantId = campaign.tenantId?.toString();

  const tenant =
    !isPlatformCampaign && campaignTenantId
      ? await Tenant.findById(campaignTenantId)
          .select("slug customDomain customDomainVerified")
          .lean<{
            slug: string;
            customDomain?: string | null;
            customDomainVerified?: boolean;
          }>()
      : null;

  interface Recipient {
    email: string;
    name: string;
    unsubscribeToken: string;
    subscriberId: string;
  }

  let recipients: Recipient[] = [];

  if (campaign.sendToAll) {
    if (isPlatformCampaign) {
      const audienceFilter = normalizePlatformAudienceFilter(
        campaign.audienceFilter,
      );
      const contacts = await AudienceContact.find({
        $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
        subscribed: true,
        status: "ACTIVE",
        verificationToken: { $exists: false },
        ...platformAudienceContactTypeCondition(audienceFilter),
      }).lean<
        {
          _id: Types.ObjectId;
          email: string;
          firstName?: string;
          lastName?: string;
          unsubscribeToken?: string;
        }[]
      >();

      recipients = contacts.map((c) => ({
        email: c.email,
        name:
          [c.firstName, c.lastName].filter(Boolean).join(" ") ||
          c.email.split("@")[0],
        unsubscribeToken: c.unsubscribeToken ?? "invalid",
        subscriberId: c._id.toString(),
      }));
    } else if (campaignTenantId) {
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
            unsubscribeToken:
              tu.newsletterPreferences?.unsubscribeToken ?? "invalid",
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
            name:
              [c.firstName, c.lastName].filter(Boolean).join(" ") ||
              c.email.split("@")[0],
            unsubscribeToken: c.unsubscribeToken ?? "invalid",
            subscriberId: c._id.toString(),
          });
        }
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

  if (recipients.length === 0) {
    campaign.status = "sent";
    campaign.sentCount = 0;
    campaign.bounceCount = 0;
    await campaign.save();
    return { sentCount: 0, bounceCount: 0, status: "sent" as const };
  }

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

  /** Odredišni URL CTA dugmeta je isti za sve primaoce — računa se jednom. */
  let finalUrl: string;
  if (campaign.campaignType === "email-landing" && campaign.landingPage?.slug) {
    finalUrl = isPlatformCampaign
      ? getPlatformNewsletterLandingUrl(campaign.landingPage.slug)
      : getNewsletterLandingUrl(campaign.landingPage.slug);
  } else {
    const ctaSlug = normalizeSlug(campaign.ctaSlug);
    finalUrl = isPlatformCampaign
      ? campaign.ctaSlug?.startsWith("http")
        ? campaign.ctaSlug
        : platformOrigin()
      : campaign.ctaSlug?.startsWith("http")
        ? campaign.ctaSlug
        : `${getLandingBaseUrl(tenant)}${ctaSlug}`;
  }

  /**
   * Primaoci koji već imaju log za ovu kampanju se preskaču. Bez toga bi svako
   * ponovno pokretanje — ručno iz panela ili kroz scheduler recovery — poslalo
   * mejl ponovo svima od prvog primaoca.
   */
  const existingLogs = await NewsletterLog.find({ campaignId: campaign._id })
    .select("recipientEmail")
    .lean<{ recipientEmail: string }[]>();
  const alreadyProcessed = new Set(existingLogs.map((l) => l.recipientEmail));

  // Isti Set hvata i duplikate unutar same liste primalaca — ručno unete liste
  // ih redovno imaju, a bez ovoga bi ta adresa dobila mejl dvaput.
  const pending = recipients.filter((r) => {
    if (alreadyProcessed.has(r.email)) return false;
    alreadyProcessed.add(r.email);
    return true;
  });

  function buildMessage(recipient: Recipient) {
    const unsubscribeUrl = `${platformOrigin()}/api/newsletter/unsubscribe?token=${recipient.unsubscribeToken}`;
    const trackingPixelId = crypto.randomUUID();
    const clickTrackingId = crypto.randomUUID();
    const campaignId = campaign._id.toString();

    const trackingCtaUrl =
      `${platformOrigin()}/api/newsletter/track/click` +
      `?campaign=${campaignId}` +
      `&subscriber=${recipient.subscriberId}` +
      `&log=${clickTrackingId}` +
      `&url=${encodeURIComponent(finalUrl)}`;

    const trackingOpenUrl =
      `${platformOrigin()}/api/newsletter/track/open` +
      `?campaign=${campaignId}` +
      `&subscriber=${recipient.subscriberId}` +
      `&log=${trackingPixelId}`;

    const personalizedContent = campaign.content
      .replace(/{{clientName}}/g, recipient.name || "poštovana")
      .replace(/{{unsubscribeUrl}}/g, unsubscribeUrl)
      .replace(/{{trackingCtaUrl}}/g, trackingCtaUrl)
      .replace(/{{trackingOpenUrl}}/g, trackingOpenUrl);

    return {
      recipient,
      trackingPixelId,
      clickTrackingId,
      message: {
        to: recipient.email,
        subject: campaign.subject,
        htmlContent: personalizedContent,
        unsubscribeUrl,
        trackingData: {
          campaignId,
          subscriberId: recipient.subscriberId,
          trackingPixelId,
        },
      },
    };
  }

  /**
   * Slanje ide u chunk-ovima kroz Resend batch API — jedan HTTP poziv po
   * chunk-u umesto jednog po primaocu. Logovi se upisuju odmah posle svakog
   * chunk-a, pa prekid usred kampanje ne izgubi trag o već poslatom.
   */
  for (let i = 0; i < pending.length; i += NEWSLETTER_BATCH_SIZE) {
    const prepared = pending
      .slice(i, i + NEWSLETTER_BATCH_SIZE)
      .map(buildMessage);

    const { success } = await sendNewsletterBatch(
      prepared.map((p) => p.message),
      isPlatformCampaign ? null : campaignTenantId,
    );

    await NewsletterLog.insertMany(
      prepared.map((p) => ({
        scope: campaign.scope ?? "tenant",
        tenantId: isPlatformCampaign ? undefined : campaign.tenantId,
        platformOwnerId: isPlatformCampaign
          ? campaign.platformOwnerId
          : undefined,
        campaignId: campaign._id,
        recipientEmail: p.recipient.email,
        ...(Types.ObjectId.isValid(p.recipient.subscriberId) && {
          recipientProfileId: new Types.ObjectId(p.recipient.subscriberId),
        }),
        status: success ? "sent" : "bounced",
        trackingPixelId: p.trackingPixelId,
        clickTrackingId: p.clickTrackingId,
      })),
    );
  }

  /**
   * Brojači se izvode iz logova, a ne iz brojača u petlji — tako su tačni i kad
   * je kampanja dovršena u više navrata. Status logova raste sent → opened →
   * clicked, pa je sve što nije "bounced" uspešno isporučeno.
   */
  const [sentCount, bounceCount] = await Promise.all([
    NewsletterLog.countDocuments({
      campaignId: campaign._id,
      status: { $ne: "bounced" },
    }),
    NewsletterLog.countDocuments({
      campaignId: campaign._id,
      status: "bounced",
    }),
  ]);

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

