import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/browser-reset?next=/
 *
 * Self-service "obriši keš" reset za netehničke korisnike (dugme u LoggedButton
 * dropdownu). Radi dve stvari koje klijentski JS ne može sam:
 *   1. Clear-Site-Data header — briše HTTP keš, SVE kolačiće (ceo .marysoll.com
 *      domen) i storage (localStorage/IndexedDB/service workere) ovog origina.
 *      Podržano u Chrome/Firefox/Safari 17.2+; za starije browsere klijentski
 *      handler u LoggedButton-u već obriše šta može pre nego što stigne ovde.
 *   2. Eksplicitno gasi HttpOnly auth kolačiće (isti atributi kao logout ruta —
 *      brisanje radi samo ako se domain/path poklope sa onima pri postavljanju).
 *
 * Odgovor je mini HTML sa meta-refresh umesto 302 jer Safari ne primenjuje
 * Clear-Site-Data pouzdano na redirect odgovorima.
 */
export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

  // Open-redirect zaštita: `next` sme biti samo relativna putanja
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam.replace(/["'<>]/g, "")
      : "/";

  const html = `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta http-equiv="refresh" content="1;url=${next}"/>
<title>Marysoll</title>
</head>
<body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;color:#6b7280;background:#fff">
<p>Brišemo sačuvane podatke…</p>
</body>
</html>`;

  const res = new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Clear-Site-Data": '"cache", "cookies", "storage"',
      "Cache-Control": "no-store",
    },
  });

  res.cookies.set("tenant-access-token", "", {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.cookies.set("tenant-refresh-token", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.cookies.set("platform-access-token", "", {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    domain: isProd ? `.${baseDomain}` : undefined,
  });
  res.cookies.set("platform-refresh-token", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    domain: isProd ? `.${baseDomain}` : undefined,
  });

  return res;
}
