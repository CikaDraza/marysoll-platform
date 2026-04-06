"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useCampaign, useAudienceContacts } from "@/hooks/campaigns/useCampaigns";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export default function CampaignEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading } = useCampaign(id);
  const { data: allContacts = [] } = useAudienceContacts();

  // Basic fields
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");

  // Content fields
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroText, setHeroText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  // Recipient overrides
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Regenerate HTML state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!campaign) return;
    const c = campaign as unknown as {
      topic: string;
      audience?: string;
      tone: string;
      content?: {
        subject?: string;
        previewText?: string;
        heroTitle?: string;
        heroText?: string;
        ctaText?: string;
        ctaUrl?: string;
        offerTitle?: string;
        offerText?: string;
      };
      recipientContactIds?: string[];
    };
    setTopic(c.topic ?? "");
    setAudience(c.audience ?? "");
    setTone(c.tone ?? "");
    setSubject(c.content?.subject ?? "");
    setPreviewText(c.content?.previewText ?? "");
    setHeroTitle(c.content?.heroTitle ?? "");
    setHeroText(c.content?.heroText ?? "");
    setCtaText(c.content?.ctaText ?? "");
    setCtaUrl(c.content?.ctaUrl ?? "");
    setSelectedContactIds(c.recipientContactIds ?? []);
  }, [campaign]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-500 mb-4">Kampanja nije pronađena.</p>
        <Link href="/marketing/campaigns/drafts" className="text-violet-600 text-sm font-medium">
          Nazad
        </Link>
      </div>
    );
  }

  const status = (campaign as unknown as { scheduling: { status: string } })
    .scheduling.status;

  if (status !== "draft") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Samo kampanje u statusu &quot;Draft&quot; se mogu izmeniti.
        </p>
        <Link href={`/marketing/campaigns/${id}`} className="text-violet-600 text-sm font-medium">
          Nazad na pregled
        </Link>
      </div>
    );
  }

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((x) => x !== contactId)
        : [...prev, contactId],
    );
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setPreviewHtml(null);
    try {
      const res = await api.post<{ html: string }>(
        `/campaigns/${id}/regenerate-template`,
        {},
      );
      setPreviewHtml(res.data.html);
    } catch {
      setError("Greška pri regeneraciji HTML-a. Pokušaj ponovo.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleApplyHtml = async () => {
    if (!previewHtml) return;
    try {
      await api.patch(`/campaigns/${id}`, { template: { html: previewHtml } });
      setPreviewHtml(null);
      toast.success("HTML template primenjen");
    } catch {
      setError("Greška pri primeni HTML-a.");
    }
  };

  const handleSave = async () => {
    if (!topic.trim() || !tone.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const existingContent = (campaign as unknown as {
        content?: {
          offerTitle?: string;
          offerText?: string;
        };
      }).content;

      await api.patch(`/campaigns/${id}`, {
        topic,
        audience,
        tone,
        content: {
          subject,
          previewText,
          heroTitle,
          heroText,
          ctaText,
          ctaUrl,
          offerTitle: existingContent?.offerTitle ?? "",
          offerText: existingContent?.offerText ?? "",
        },
        recipientContactIds: selectedContactIds,
      });
      toast.success("Izmene sačuvane");
    } catch {
      setError("Greška pri čuvanju. Pokušaj ponovo.");
    } finally {
      setIsSaving(false);
    }
  };

  const inp =
    "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 transition placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const lbl =
    "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";
  const sectionTitle =
    "text-sm font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-800";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/marketing/campaigns/${id}`}
          className="text-xs text-gray-400 hover:text-violet-500 transition-colors flex items-center gap-1 mb-3"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Pregled kampanje
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Izmeni kampanju</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Izmeni parametre i sadržaj kampanje pre slanja.
        </p>
      </div>

      <div className="space-y-5 max-w-2xl">

        {/* ── Basic settings ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <p className={sectionTitle}>Osnovna podešavanja</p>
          <div className="space-y-4">
            <div>
              <label className={lbl}>Tema kampanje</label>
              <input
                className={inp}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="npr. Prolećna akcija, Popust na tretmane..."
              />
            </div>
            <div>
              <label className={lbl}>Ciljna publika</label>
              <input
                className={inp}
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="npr. Klijenti koji nisu posjetili 3 meseca"
              />
            </div>
            <div>
              <label className={lbl}>Ton komunikacije</label>
              <select className={inp} value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="">Izaberi ton</option>
                <option value="informative">Informativno</option>
                <option value="friendly">Prijateljski</option>
                <option value="urgent">Urgentno</option>
                <option value="luxury">Luksuzno</option>
                <option value="seasonal">Sezonski</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Email content ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <p className={sectionTitle}>Sadržaj email-a</p>
          <div className="space-y-4">
            <div>
              <label className={lbl}>Subject</label>
              <input
                className={inp}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="npr. Kiki Kiss Beauty: Specijalna ponuda za vikend!"
              />
            </div>
            <div>
              <label className={lbl}>Preview text</label>
              <input
                className={inp}
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Kratki tekst koji se prikazuje u inboxu..."
              />
            </div>
            <div>
              <label className={lbl}>Hero naslov</label>
              <input
                className={inp}
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="npr. Zablistajte ovog vikenda!"
              />
            </div>
            <div>
              <label className={lbl}>Hero tekst</label>
              <textarea
                className={`${inp} resize-none`}
                rows={4}
                value={heroText}
                onChange={(e) => setHeroText(e.target.value)}
                placeholder="Glavni tekst emaila..."
              />
            </div>
            <div>
              <label className={lbl}>CTA tekst</label>
              <input
                className={inp}
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="npr. Rezerviši termin sada!"
              />
            </div>
            <div>
              <label className={lbl}>CTA URL</label>
              <input
                className={inp}
                type="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="https://vasasalon.com/rezervacija"
              />
              <p className="text-[11px] text-gray-400 mt-1">Link na koji vodi dugme u emailu</p>
            </div>
          </div>
        </div>

        {/* ── Recipients ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <p className={sectionTitle}>Primaoci</p>
          {allContacts.length === 0 ? (
            <p className="text-sm text-gray-400">Nema kontakata u bazi.</p>
          ) : (
            <>
              <p className="text-[11px] text-gray-400 mb-3">
                {selectedContactIds.length === 0
                  ? "Svi aktivni pretplaćeni kontakti (bez selekcije)"
                  : `${selectedContactIds.length} odabran${selectedContactIds.length === 1 ? "" : "o"}`}
                {" "}— označi da ograničiš primaoce
              </p>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {allContacts.map((contact) => {
                    const checked = selectedContactIds.includes(contact._id);
                    const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
                    return (
                      <label
                        key={contact._id}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleContact(contact._id)}
                          className="w-4 h-4 rounded accent-violet-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{contact.email}</p>
                          {name && (
                            <p className="text-[11px] text-gray-400 truncate">{name}</p>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          contact.status === "ACTIVE" && contact.subscribed
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                        }`}>
                          {contact.status === "ACTIVE" && contact.subscribed ? "aktivan" : "neaktivan"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {selectedContactIds.length > 0 && (
                <button
                  onClick={() => setSelectedContactIds([])}
                  className="mt-2 text-[11px] text-violet-500 hover:text-violet-700 transition-colors"
                >
                  Ukloni selekciju (pošalji svima)
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Regenerate HTML button ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <p className={sectionTitle}>HTML template</p>
          <p className="text-[12px] text-gray-400 dark:text-gray-500 mb-4">
            Regeneriši HTML email template koristeći trenutne vrednosti iz sadržaja.
            AI će koristiti tačno te vrednosti i sačuvati vizuelni stil.
          </p>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
          >
            {isRegenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Regenerišem...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Regeneriši HTML
              </>
            )}
          </button>
        </div>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <Link
            href={`/marketing/campaigns/${id}`}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-center border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Otkaži
          </Link>
          <button
            onClick={handleSave}
            disabled={isSaving || !topic.trim() || !tone.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
          >
            {isSaving ? "Čuvanje..." : "Sačuvaj izmene"}
          </button>
        </div>
      </div>

      {/* ── HTML Preview modal ──────────────────────────────────────────────── */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Pregled novog HTML-a</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">Pregledaj pre primene</p>
              </div>
              <button
                onClick={() => setPreviewHtml(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <iframe
                srcDoc={previewHtml}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700"
                style={{ height: "500px" }}
                sandbox="allow-same-origin"
                title="Email preview"
              />
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <button
                onClick={() => setPreviewHtml(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Zatvori
              </button>
              <button
                onClick={handleApplyHtml}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              >
                Primeni HTML
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
