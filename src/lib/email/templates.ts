/**
 * Email HTML Templates
 * Svi transakcioni emailovi za Marysoll platformu.
 */

const PRIMARY = "#a855f7";
const PRIMARY_DARK = "#7c3aed";

function base(body: string): string {
  return `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:${PRIMARY};padding:28px 40px;">
            <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Marysoll</span><br/>
            <span style="font-size:12px;color:rgba(255,255,255,0.75);">Platforma za beauty salone</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">${body}</td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
              © ${new Date().getFullYear()} Marysoll · Ako niste vi inicirali ovu akciju, slobodno ignorišite ovaj email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label: string, url: string): string {
  return `
<div style="text-align:center;margin:28px 0 16px;">
  <a href="${url}"
    style="display:inline-block;background:${PRIMARY};color:#fff;
           padding:13px 30px;border-radius:8px;font-weight:700;
           font-size:14px;text-decoration:none;">
    ${label}
  </a>
</div>
<p style="text-align:center;font-size:11px;color:#9ca3af;margin:0;">
  Ili kopirajte link: <a href="${url}" style="color:${PRIMARY_DARK};word-break:break-all;">${url}</a>
</p>`;
}

export function ownerVerificationHtml(p: {
  ownerName: string;
  salonName: string;
  verifyUrl: string;
  subdomain: string;
  trialDays: number;
}): string {
  return base(`
    <h2 style="margin:0 0 6px;font-size:21px;color:#111827;">Potvrdite email — salon čeka! 🎉</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
      Zdravo <strong style="color:#111827;">${p.ownerName}</strong>,
    </p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;">
      Uspešno ste registrovali salon <strong>${p.salonName}</strong>.
      Potvrdite email da aktivirate nalog.
    </p>
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px 18px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.9;">
        ✅ Probni period: <strong>${p.trialDays} dana besplatno</strong><br/>
        🌐 Vaš subdomen: <strong>${p.subdomain}</strong><br/>
        📅 Online zakazivanje odmah aktivno
      </p>
    </div>
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Link važi <strong>24 sata</strong>.</p>
    ${btn("Potvrdite email adresu →", p.verifyUrl)}
  `);
}

export function ownerWelcomeHtml(p: {
  ownerName: string;
  salonName: string;
  subdomain: string;
  dashboardUrl: string;
  trialDays: number;
  trialEndsAt: string;
}): string {
  return base(`
    <h2 style="margin:0 0 6px;font-size:21px;color:#111827;">Email potvrđen — salon je aktivan! ✅</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
      Zdravo <strong style="color:#111827;">${p.ownerName}</strong>,
    </p>
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:16px 20px;margin:0 0 20px;">
      <p style="margin:0 0 8px;font-weight:700;color:#111827;font-size:14px;">${p.salonName}</p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.9;">
        🌐 Subdomen: <a href="https://${p.subdomain}" style="color:${PRIMARY_DARK};">${p.subdomain}</a><br/>
        🎁 Probni period: <strong>${p.trialDays} dana</strong> (do ${p.trialEndsAt})<br/>
        📊 Status: <strong style="color:#16a34a;">Aktivan</strong>
      </p>
    </div>
    <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#374151;">Sledeći koraci:</p>
    <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.9;">
      1. Popunite profil salona (logo, radno vreme, adresa)<br/>
      2. Dodajte usluge i cenovnik<br/>
      3. Podelite link klijentima — mogu odmah da zakazuju
    </p>
    ${btn("Otvorite Admin Panel", p.dashboardUrl)}
  `);
}

export function clientVerificationHtml(p: {
  clientName: string;
  salonName: string;
  verifyUrl: string;
}): string {
  return base(`
    <h2 style="margin:0 0 6px;font-size:21px;color:#111827;">Potvrdite email adresu</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
      Zdravo <strong style="color:#111827;">${p.clientName}</strong>,
    </p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;">
      Registrovali ste se na platformu salona <strong>${p.salonName}</strong>.
      Potvrdite email da biste mogli da zakazujete termine.
    </p>
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Link važi <strong>24 sata</strong>.</p>
    ${btn("Potvrdite email adresu →", p.verifyUrl)}
  `);
}

export function clientWelcomeHtml(p: {
  clientName: string;
  salonName: string;
  salonUrl: string;
}): string {
  return base(`
    <h2 style="margin:0 0 6px;font-size:21px;color:#111827;">Nalog aktiviran! 🎉</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
      Zdravo <strong style="color:#111827;">${p.clientName}</strong>,
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;">
      Vaš nalog u salonu <strong>${p.salonName}</strong> je spreman.
      Možete zakazati termine, pregledati cenovnik i pratiti vaše rezervacije.
    </p>
    ${btn("Zakažite termin", p.salonUrl)}
  `);
}
