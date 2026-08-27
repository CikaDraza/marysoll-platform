import { beforeEach, describe, expect, it, vi } from "vitest";

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
const MARYSOLL_ICON = "/marysoll_elegant_logo.png";

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

describe("web push ikonica", () => {
  beforeEach(() => {
    state.tenantId = "t-1";
    state.notificationLogo = null;
  });

  it("koristi notificationLogo podešen u tenant Profilu", async () => {
    state.notificationLogo = `${CDN}/salon.png`;
    expect(await push({})).toBe(`${CDN}/salon.png`);
  });

  it("poštuje eksplicitnu raster ikonicu pozivaoca", async () => {
    state.notificationLogo = `${CDN}/salon.png`;
    expect(await push({ icon: `${CDN}/kampanja.webp` })).toBe(
      `${CDN}/kampanja.webp`,
    );
  });

  it("odbacuje SVG pozivaoca i koristi tenantov raster logo", async () => {
    state.notificationLogo = `${CDN}/salon.png`;
    expect(await push({ icon: `${CDN}/logo.svg` })).toBe(`${CDN}/salon.png`);
  });

  it.each([null, `${CDN}/salon.svg`])(
    "bez validnog tenant loga koristi Marysoll branding: %s",
    async (logo) => {
      state.notificationLogo = logo;
      expect(await push({})).toBe(MARYSOLL_ICON);
    },
  );

  it("platformski korisnik bez tenantId dobija Marysoll branding", async () => {
    state.tenantId = undefined;
    expect(await push({ icon: `${CDN}/logo.svg` })).toBe(MARYSOLL_ICON);
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
