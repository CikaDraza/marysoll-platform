"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCampaign, useDeleteCampaign } from "@/hooks/campaigns/useCampaigns";

export default function CampaignDeletePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: campaign, isLoading } = useCampaign(id);
  const deleteMutation = useDeleteCampaign();

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

  const c = campaign as unknown as { topic: string; salonName: string };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    router.push("/marketing/campaigns/drafts");
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            className="text-red-500"
          >
            <path
              d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Obriši kampanju
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Da li si siguran/a da želiš da obrišeš kampanju:
        </p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-6">
          &ldquo;{c.topic}&rdquo;
        </p>
        <p className="text-xs text-red-500 mb-6">
          Ova akcija je nepovratna. Kampanja će biti trajno obrisana.
        </p>

        {deleteMutation.error && (
          <p className="text-sm text-red-500 mb-4">
            {deleteMutation.error.message}
          </p>
        )}

        <div className="flex gap-3">
          <Link
            href={`/marketing/campaigns/${id}`}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-center border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Otkaži
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? "Brisanje..." : "Da, obriši"}
          </button>
        </div>
      </div>
    </div>
  );
}
