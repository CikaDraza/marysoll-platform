import { describe, expect, it } from "vitest";
import {
  buildRobotsRules,
  DISALLOWED_PATHS,
  EXPLICITLY_ALLOWED_AGENTS,
} from "./robotsRules";

type Rule = { userAgent?: string | string[]; allow?: unknown; disallow?: unknown };

const rules = () => buildRobotsRules() as Rule[];
const ruleFor = (agent: string) =>
  rules().find((r) => r.userAgent === agent);

describe("robots — AI i klasični crawleri", () => {
  it("OAI-SearchBot sme da čita javni tenant sadržaj", () => {
    const rule = ruleFor("OAI-SearchBot");
    expect(rule).toBeDefined();
    expect(rule!.allow).toBe("/");
  });

  it("OAI-SearchBot nije blokiran nijednim pravilom", () => {
    const rule = ruleFor("OAI-SearchBot")!;
    expect(rule.disallow).not.toContain("/");
  });

  it("Googlebot i Bingbot su takođe eksplicitno dozvoljeni", () => {
    for (const agent of ["Googlebot", "Bingbot"]) {
      expect(ruleFor(agent)?.allow).toBe("/");
    }
  });

  it("wildcard grupa i dalje postoji za sve ostale agente", () => {
    expect(ruleFor("*")?.allow).toBe("/");
  });

  it("GPTBot se ne pominje — politika treninga se ne dira", () => {
    const serialized = JSON.stringify(buildRobotsRules());
    expect(serialized).not.toContain("GPTBot");
  });
});

describe("robots — zaštita privatnih ruta", () => {
  it("SVAKA imenovana grupa ponavlja ceo disallow spisak", () => {
    // Ključno: imenovana grupa poništava `*`, pravila se ne nasleđuju.
    for (const agent of EXPLICITLY_ALLOWED_AGENTS) {
      const rule = ruleFor(agent);
      expect(rule, `nedostaje grupa za ${agent}`).toBeDefined();
      for (const path of DISALLOWED_PATHS) {
        expect(
          rule!.disallow as string[],
          `${agent} ne blokira ${path}`,
        ).toContain(path);
      }
    }
  });

  it("admin, superadmin i dashboard su blokirani za sve agente", () => {
    for (const rule of rules()) {
      const disallow = rule.disallow as string[];
      expect(disallow).toContain("/superadmin");
      expect(disallow).toContain("/admin");
      expect(disallow).toContain("/dashboard");
    }
  });

  it("auth rute su blokirane za sve agente", () => {
    for (const rule of rules()) {
      const disallow = rule.disallow as string[];
      for (const path of ["/login", "/reset-password", "/verify-email"]) {
        expect(disallow).toContain(path);
      }
    }
  });

  it("privatni API je blokiran za sve agente", () => {
    for (const rule of rules()) {
      expect(rule.disallow as string[]).toContain("/api");
    }
  });

  it("putanje nemaju završnu kosu crtu — inače gola /dashboard ostaje otvorena", () => {
    for (const path of DISALLOWED_PATHS) {
      expect(path.endsWith("/")).toBe(false);
    }
  });

  it("javne tenant stranice nisu blokirane", () => {
    for (const rule of rules()) {
      const disallow = rule.disallow as string[];
      for (const publicPath of ["/usluge", "/termini", "/blogs"]) {
        expect(disallow).not.toContain(publicPath);
      }
    }
  });
});
