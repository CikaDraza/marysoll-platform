"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useCampaign } from "@/hooks/campaigns/useCampaigns";
import { api } from "@/lib/api";

export default function CampaignEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: campaign, isLoading } = useCampaign(id);

  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaign) {
      const c = campaign as unknown as {
        topic: string;
        audience?: string;
        tone: string;
      };
      setTopic(c.topic ?? "");
      setAudience(c.audience ?? "");
      setTone(c.tone ?? "");
    }
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
        <Link
          href={`/marketing/campaigns/${id}`}
          className="text-violet-600 text-sm font-medium"
        >
          Nazad na pregled
        </Link>
      </div>
    );
  }

  const handleSave = async () => {
    if (!topic.trim() || !tone.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      await api.patch(`/campaigns/${id}`, { topic, audience, tone });
      router.push(`/marketing/campaigns/${id}`);
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

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/marketing/campaigns/${id}`}
          className="text-xs text-gray-400 hover:text-violet-500 transition-colors flex items-center gap-1 mb-3"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Pregled kampanje
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Izmeni kampanju
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Izmeni osnovne parametre kampanje. AI sadržaj se može regenerisati
          kroz Email Campaign AI wizard.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 max-w-xl">
        <div className="space-y-5">
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
            <select
              className={inp}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            >
              <option value="">Izaberi ton</option>
              <option value="informative">Informativno</option>
              <option value="friendly">Prijateljski</option>
              <option value="urgent">Urgentno</option>
              <option value="luxury">Luksuzno</option>
              <option value="seasonal">Sezonski</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
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
      </div>
    </div>
  );
}
