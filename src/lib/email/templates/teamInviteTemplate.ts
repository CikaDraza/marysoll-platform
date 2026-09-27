import "server-only";

import { wrapEmailLayout } from "@/lib/email/wrapEmailLayout";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

export async function teamInviteTemplate(input: {
  tenantId: string;
  salonName: string;
  recipientName: string;
  inviterName: string | null;
  inviteUrl: string;
  expiresAt: Date;
}): Promise<string> {
  const salonName = escapeHtml(input.salonName);
  const recipientName = escapeHtml(input.recipientName);
  const inviter = input.inviterName ? escapeHtml(input.inviterName) : null;
  const inviteUrl = escapeHtml(input.inviteUrl);
  const expiry = new Intl.DateTimeFormat("sr-Latn-RS", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Belgrade",
  }).format(input.expiresAt);

  const content = `
    <h1 style="margin:0 0 18px;color:#111827;font-size:24px;line-height:1.3;">Poziv u tim salona ${salonName}</h1>
    <p style="margin:0 0 14px;color:#374151;line-height:1.7;">Zdravo ${recipientName},</p>
    <p style="margin:0 0 20px;color:#374151;line-height:1.7;">
      ${inviter ? `<strong>${inviter}</strong> vas je pozvao/la` : "Pozvani ste"} da postanete član tima salona <strong>${salonName}</strong>.
    </p>
    <p style="margin:0 0 24px;color:#374151;line-height:1.7;">
      Aktivirajte svoj nalog i postavite ličnu lozinku. Ovaj poziv ne daje vlasnička niti administratorska ovlašćenja.
    </p>
    <p style="margin:0 0 24px;text-align:center;">
      <a href="${inviteUrl}" style="display:inline-block;padding:13px 24px;border-radius:10px;background:#7c3aed;color:#ffffff;font-weight:700;">Aktiviraj nalog</a>
    </p>
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
      Link važi do ${escapeHtml(expiry)}. Ako niste očekivali ovaj poziv, možete ignorisati poruku.
    </p>
  `;

  return wrapEmailLayout({
    title: `Poziv u tim — ${salonName}`,
    content,
    tenantId: input.tenantId,
  });
}
