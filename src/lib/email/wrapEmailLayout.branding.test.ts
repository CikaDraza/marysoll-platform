import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
}));

vi.mock("@/models/SalonProfile", () => ({
  SalonProfile: {
    findOne: () => ({ lean: async () => state.profile }),
  },
}));

vi.mock("@/models/ProfilPlatforme", () => ({
  ProfilPlatforme: {
    findOne: () => ({
      sort: () => ({
        select: () => ({ lean: async () => null }),
      }),
    }),
  },
}));

vi.mock("@/lib/platform/host-context", () => ({
  platformOrigin: () => "https://marysoll.test",
}));

const TENANT_ID = "507f1f77bcf86cd799439011";
const CDN = "https://cdn.example.com";

describe("email notification branding", () => {
  beforeEach(() => {
    state.profile = {
      name: "Salon",
      notificationLogo: null,
      logo: null,
    };
  });

  it("koristi raster notificationLogo i nikada site SVG", async () => {
    state.profile = {
      name: "Salon",
      notificationLogo: `${CDN}/notification.png`,
      logo: `${CDN}/site.svg`,
    };
    const { resolveSalon } = await import("./wrapEmailLayout");
    expect((await resolveSalon(TENANT_ID)).logo).toBe(
      `${CDN}/notification.png`,
    );
  });

  it.each([null, `${CDN}/legacy.svg`])(
    "bez validnog notificationLogo koristi Marysoll, ne raster site logo: %s",
    async (notificationLogo) => {
      state.profile = {
        name: "Salon",
        notificationLogo,
        logo: `${CDN}/site.png`,
      };
      const { resolveSalon, wrapEmailLayout } = await import("./wrapEmailLayout");
      expect((await resolveSalon(TENANT_ID)).logo).toBeNull();
      const html = await wrapEmailLayout({
        title: "Test",
        content: "Sadržaj",
        tenantId: TENANT_ID,
      });
      expect(html).toContain(
        'src="https://marysoll.test/marysoll_elegant_logo.png"',
      );
      expect(html).not.toContain(`${CDN}/site.png`);
    },
  );

  it("platform email koristi Marysoll branding", async () => {
    const { wrapEmailLayout } = await import("./wrapEmailLayout");
    const html = await wrapEmailLayout({ title: "Test", content: "Sadržaj" });
    expect(html).toContain(
      'src="https://marysoll.test/marysoll_elegant_logo.png"',
    );
  });
});
