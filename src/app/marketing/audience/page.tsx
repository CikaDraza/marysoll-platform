"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FeatureGate } from "@/components/shared/FeatureGate";
import {
  useAudienceSegments,
  useCreateAudienceSegment,
  useDeleteAudienceSegment,
  type AudienceSegmentFilters,
} from "@/hooks/audience/useAudienceSegments";

function BackChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ROLE_OPTIONS = [
  { value: "CLIENT", label: "Klijenti" },
  { value: "STAFF", label: "Osoblje" },
  { value: "SALON_ADMIN", label: "Admin salona" },
];

interface CreateFormState {
  name: string;
  lastVisitDays: string;
  subscribed: string;
  roles: string[];
}

function CreateSegmentForm({
  onClose,
}: {
  onClose: () => void;
}) {
  const createMutation = useCreateAudienceSegment();
  const [form, setForm] = useState<CreateFormState>({
    name: "",
    lastVisitDays: "",
    subscribed: "",
    roles: ["CLIENT"],
  });

  const handleRoleToggle = (role: string) => {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const filters: AudienceSegmentFilters = {
      roles: form.roles.length > 0 ? form.roles : ["CLIENT"],
    };
    if (form.lastVisitDays) {
      filters.lastVisitDays = parseInt(form.lastVisitDays, 10);
    }
    if (form.subscribed === "true") filters.subscribed = true;
    if (form.subscribed === "false") filters.subscribed = false;

    await createMutation.mutateAsync({ name: form.name.trim(), filters });
    onClose();
  };

  const inp =
    "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition placeholder:text-gray-400";
  const lbl =
    "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 mb-6"
    >
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5">
        Novi segment
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={lbl}>Naziv segmenta *</label>
          <input
            className={inp}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="npr. Redovni klijenti, Neaktivni 90 dana..."
            required
          />
        </div>

        <div>
          <label className={lbl}>Poslednja poseta (dana)</label>
          <input
            className={inp}
            type="number"
            min="1"
            value={form.lastVisitDays}
            onChange={(e) =>
              setForm((p) => ({ ...p, lastVisitDays: e.target.value }))
            }
            placeholder="npr. 30 = klijenti koji su bili u poslednjih 30 dana"
          />
        </div>

        <div>
          <label className={lbl}>Newsletter pretplata</label>
          <select
            className={inp}
            value={form.subscribed}
            onChange={(e) =>
              setForm((p) => ({ ...p, subscribed: e.target.value }))
            }
          >
            <option value="">Sve (bez filtera)</option>
            <option value="true">Samo pretplaćeni</option>
            <option value="false">Samo nepretplaćeni</option>
          </select>
        </div>

        <div>
          <label className={lbl}>Uloge</label>
          <div className="flex gap-2 flex-wrap">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleRoleToggle(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  form.roles.includes(r.value)
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {createMutation.error && (
          <p className="text-sm text-red-500">{createMutation.error.message}</p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Otkaži
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !form.name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? "Kreiranje..." : "Kreiraj segment"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function SegmentFilterBadge({ label }: { label: string }) {
  return (
    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      {label}
    </span>
  );
}

export default function AudiencePage() {
  const { data: segments, isLoading } = useAudienceSegments();
  const deleteMutation = useDeleteAudienceSegment();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <FeatureGate feature="emailCampaignAi">
    <div>
      <div className="mb-6">
        <Link
          href="/marketing"
          className="text-xs text-gray-400 hover:text-violet-500 transition-colors flex items-center gap-1 mb-3"
        >
          <BackChevron />
          Marketing
        </Link>
        <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-1">
          Marketing
        </p>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Audience Segmentation
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Kreiraj segmente klijenata i targetiraj kampanje
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              + Novi segment
            </button>
          )}
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <CreateSegmentForm onClose={() => setShowForm(false)} />
        )}
      </AnimatePresence>

      {/* Info about how to use segments */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 mb-6"
      >
        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-2">
          Upotreba
        </p>
        <p className="text-sm text-emerald-800 dark:text-emerald-200">
          Segmenti se mogu primeniti na email kampanje u toku Email Campaign AI wizarda — umesto slanja
          svim klijentima, biraš konkretan segment. Procenjeni broj primaoca se prikazuje ispod naziva segmenta.
        </p>
      </motion.div>

      {/* Segments list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 animate-pulse"
            >
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : !segments || segments.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-emerald-500"
            >
              <path
                d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Nemaš kreiranih segmenata. Kreiraj prvi segment iznad.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {segments.map((seg, idx) => (
            <motion.div
              key={seg._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {seg.name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">
                    ~{seg.estimatedCount} primaoci
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {seg.filters.roles?.map((r) => (
                      <SegmentFilterBadge key={r} label={r} />
                    ))}
                    {seg.filters.lastVisitDays && (
                      <SegmentFilterBadge
                        label={`Poseta ≤ ${seg.filters.lastVisitDays}d`}
                      />
                    )}
                    {seg.filters.subscribed === true && (
                      <SegmentFilterBadge label="Newsletter" />
                    )}
                    {seg.filters.subscribed === false && (
                      <SegmentFilterBadge label="Nije na newsletteru" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-[11px] text-gray-400">
                    {new Date(seg.createdAt).toLocaleDateString("sr-RS")}
                  </p>
                  <button
                    onClick={() => handleDelete(seg._id)}
                    disabled={deletingId === seg._id}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletingId === seg._id ? "Briše..." : "Obriši"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
    </FeatureGate>
  );
}
