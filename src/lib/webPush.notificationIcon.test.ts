import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_NOTIFICATION_ICON } from "@/lib/branding/rasterLogo";

/**
 * Tvrdo pravilo: browseri i mobilni telefoni NE renderuju SVG kao notification
 * ikonicu (prikažu uzvičnik). Zato tenant ima dva loga — `logo` (sajt/favicon,
 * sme SVG) i `notificationLogo` (raster, iz Dashboard > Profil). Ovi testovi
 * čuvaju da nijedan push ne izađe sa SVG ikonicom, bez obzira šta pozivalac
 * pošalje, i da tenantov logo stvarno stigne do browsera.
 */

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  sent: [] as { icon?: string }[],
  tenantId: "t-1" as string | undefined,
  notificationLogo: null as string | null,
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async (_sub: unknown, message: string) => {
      state.sent.push(JSON.parse(message));
    }),
  },
}));

vi.mock("@/lib/vapid", () => ({
  getVapidKeys: () => ({
    publicKey: "pub",
    privateKey: "priv",
    email: "a@b.c",
  }),
}));

vi.mock("@/models/TenantUser", () => ({
  TenantUser: {
    findById: () => ({
      select: () => ({
        lean: async () => ({
          tenantId: state.tenantId,
          pushSubscriptions: [
            { endpoint: "e1", keys: { p256dh: "p", auth: "a" }, origin: null },
          ],
        }),
      }),
    }),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("@/models/AuthUser", () => ({ AuthUser: {} }));

vi.mock("@/models/SalonProfile", () => ({
  SalonProfile: {
    findOne: () => ({
      select: () => ({
        lean: async () => ({ notificationLogo: state.notificationLogo }),
      }),
    }),
  },
}));

const CDN = "https://res.cloudinary.com/demo/image/upload";

async function push(payload: { icon?: string }): Promise<string | undefined> {
  state.sent = [];
  const { sendWebPushToUser } = await import("@/lib/webPush");
  await sendWebPushToUser("tenant-user-1", {
    title: "Salon",
    body: "poruka",
    ...payload,
  });
  return state.sent[0]?.icon;
}

describe("push ikonica", () => {
  beforeEach(() => {
    state.tenantId = "t-1";
    state.notificationLogo = null;
  });

  it("koristi tenantov notificationLogo kad pozivalac ne pošalje ikonicu", async () => {
    state.notificationLogo = `${CDN}/salon.png`;
    expect(await push({})).toBe(`${CDN}/salon.png`);
  });

  it("poštuje eksplicitnu raster ikonicu pozivaoca", async () => {
    state.notificationLogo = `${CDN}/salon.png`;
    expect(await push({ icon: `${CDN}/kampanja.webp` })).toBe(
      `${CDN}/kampanja.webp`,
    );
  });

  it("SVG od pozivaoca se odbacuje i zamenjuje tenantovim rasterom", async () => {
    state.notificationLogo = `${CDN}/salon.png`;
    expect(await push({ icon: `${CDN}/logo-sajta.svg` })).toBe(
      `${CDN}/salon.png`,
    );
  });

  it("SVG kao notificationLogo pada na platformski default", async () => {
    state.notificationLogo = `${CDN}/salon.svg`;
    expect(await push({})).toBe(DEFAULT_NOTIFICATION_ICON);
  });

  it("bez tenantovog loga koristi platformski default", async () => {
    expect(await push({})).toBe(DEFAULT_NOTIFICATION_ICON);
  });

  it("korisnik bez tenanta ne ostaje bez ikonice", async () => {
    state.tenantId = undefined;
    expect(await push({})).toBe(DEFAULT_NOTIFICATION_ICON);
  });

  it("nijedan izlaz nikada nije SVG", async () => {
    for (const logo of [`${CDN}/a.svg`, null, `${CDN}/a.png`]) {
      state.notificationLogo = logo;
      for (const icon of [undefined, `${CDN}/b.svg`, "   ", ""]) {
        expect(await push({ icon })).not.toMatch(/\.svg(\?|#|$)/i);
      }
    }
  });
});
