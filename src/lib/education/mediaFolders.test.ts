import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");

describe("gde media završava u Cloudinary-ju", () => {
  it("dokumenti idu u tenant folder za dokumente, ne u chat", () => {
    const route = read("src/app/api/cloudinary/files/route.ts");

    expect(route).toContain("getTenantFolder");
    expect(route).toContain("${folder}/dokumenti");
    // Deljena validacija sme da se uvozi iz chat modula; cilj upload-a ne sme
    // da bude chat folder.
    expect(route).not.toContain("${folder}/chat");
  });

  it("editor šalje fajlove na tu rutu, a ne više na chat upload", () => {
    const adapter = read("src/hooks/useContentMediaAuthoring.ts");

    expect(adapter).toContain('"/api/cloudinary/files"');
    expect(adapter).not.toContain("/api/admin/chat/upload");
  });

  it("svaki media kanal je tenant-scoped na serveru", () => {
    // Bez ovoga bi galerija mogla da pokaže tuđe fajlove.
    for (const route of [
      "src/app/api/cloudinary/images/route.ts",
      "src/app/api/cloudinary/videos/route.ts",
      "src/app/api/cloudinary/files/route.ts",
    ]) {
      const source = read(route);
      expect(source).toMatch(/resolveCloudinary(List|Upload)Folder|getTenantFolder/);
      expect(source).toContain("requireAdmin");
    }
  });

  it("chat upload ruta ostaje netaknuta", () => {
    const chat = read("src/app/api/admin/chat/upload/route.ts");

    expect(chat).toContain("/chat");
  });
});
