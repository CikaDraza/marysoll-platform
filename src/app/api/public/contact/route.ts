import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/email/resend";
import { wrapEmailLayout } from "@/lib/email/wrapEmailLayout";

const TO = "kontakt@marysoll.com";
const FROM = `"Marysoll" <${process.env.EMAIL_FROM ?? "noreply@marysoll.com"}>`;

export async function POST(req: NextRequest) {
  let body: { firstName?: string; lastName?: string; email?: string; phone?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtev." }, { status: 400 });
  }

  const { firstName = "", lastName = "", email = "", phone = "", message = "" } = body;

  if (!firstName.trim() || !email.trim() || !message.trim()) {
    return NextResponse.json({ error: "Ime, email i poruka su obavezni." }, { status: 422 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Neispravna email adresa." }, { status: 422 });
  }

  const content = `
    <p style="font-size:18px;font-weight:700;color:#1a1025;margin-bottom:16px;">Nova poruka sa kontakt forme</p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8f4;font-size:13px;color:#9089fc;font-weight:600;width:140px;vertical-align:top;">Ime i prezime</td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0e8f4;font-size:14px;color:#3d2952;vertical-align:top;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8f4;font-size:13px;color:#9089fc;font-weight:600;vertical-align:top;">Email</td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0e8f4;font-size:14px;color:#3d2952;vertical-align:top;"><a href="mailto:${escapeHtml(email)}" style="color:#9089fc;">${escapeHtml(email)}</a></td>
      </tr>
      ${phone ? `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8f4;font-size:13px;color:#9089fc;font-weight:600;vertical-align:top;">Telefon</td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0e8f4;font-size:14px;color:#3d2952;vertical-align:top;">${escapeHtml(phone)}</td>
      </tr>` : ""}
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#9089fc;font-weight:600;vertical-align:top;">Poruka</td>
        <td style="padding:10px 0 10px 16px;font-size:14px;color:#3d2952;vertical-align:top;line-height:1.7;">${escapeHtml(message).replace(/\n/g, "<br/>")}</td>
      </tr>
    </table>

    <p style="font-size:12px;color:#b0a0bc;">Primljeno: ${new Date().toLocaleString("sr-Latn", { dateStyle: "long", timeStyle: "short" })}</p>
  `;

  try {
    const html = await wrapEmailLayout({
      title: `Kontakt forma — ${firstName} ${lastName}`,
      content,
    });

    await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `Kontakt forma: ${firstName} ${lastName}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/public/contact]", err);
    return NextResponse.json({ error: "Greška pri slanju poruke." }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
