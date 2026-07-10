"use client";

/**
 * Growth Studio — admin vaučeri: lista + ručno izdavanje ("Pokloni vaučer").
 */
import { useState } from "react";
import toast from "react-hot-toast";
import {
  useLoyaltyAdminVouchers,
  useIssueLoyaltyVoucher,
  useRevokeLoyaltyVoucher,
  useLoyaltyAdminAccounts,
} from "@/hooks/useLoyaltyAdmin";
import { useSalonProfile } from "@/hooks/useSalonProfile";
import { clientNoun, clientNounCap, genderPast } from "@/lib/clientWording";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm";
const inp =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30";
const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktivan",
  reserved: "Rezervisan",
  redeemed: "Iskorišćen",
  expired: "Istekao",
  revoked: "Povučen",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  reserved: "bg-amber-100 text-amber-700",
  redeemed: "bg-gray-100 text-gray-500",
  expired: "bg-gray-100 text-gray-400",
  revoked: "bg-rose-100 text-rose-600",
};

function IssueForm({ onDone }: { onDone: () => void }) {
  const issue = useIssueLoyaltyVoucher();
  const clientGender = useSalonProfile().data?.clientGender;
  const [clientQuery, setClientQuery] = useState("");
  const { data: accounts } = useLoyaltyAdminAccounts(clientQuery);
  const [tenantUserId, setTenantUserId] = useState("");
  const [type, setType] = useState<"percent" | "fixed" | "free_service">(
    "percent",
  );
  const [value, setValue] = useState(10);
  const [serviceName, setServiceName] = useState("");
  const [expiresDays, setExpiresDays] = useState(90);

  const handleSubmit = async () => {
    if (!tenantUserId) {
      toast.error(`Izaberite ${clientNoun(clientGender, "acc")}`);
      return;
    }
    try {
      await issue.mutateAsync({
        tenantUserId,
        type,
        value: type === "free_service" ? 0 : value,
        serviceName,
        expiresDays,
      });
      toast.success(
        `Vaučer izdat i ${clientNoun(clientGender)} ${genderPast(clientGender, "obaveštena", "obavešten")} 🎁`,
      );
      onDone();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Greška pri izdavanju";
      toast.error(msg);
    }
  };

  return (
    <div className={`${card} p-6 space-y-4`}>
      <h3 className="text-sm font-black text-gray-900 dark:text-white">
        Pokloni vaučer
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={lbl}>{clientNounCap(clientGender)}</label>
          <input
            className={inp}
            placeholder="Pretraga klijenata..."
            value={clientQuery}
            onChange={(e) => {
              setClientQuery(e.target.value);
              setTenantUserId("");
            }}
          />
          {clientQuery && !tenantUserId && (
            <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 max-h-44 overflow-y-auto">
              {(accounts?.accounts ?? []).map((a) => (
                <button
                  key={a._id}
                  onClick={() => {
                    setTenantUserId(a.tenantUserId);
                    setClientQuery(a.client?.name ?? a.client?.email ?? "");
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-violet-50 dark:hover:bg-white/5"
                >
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {a.client?.name ?? "—"}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {a.client?.email}
                  </span>
                </button>
              ))}
              {!accounts?.accounts?.length && (
                <p className="px-3.5 py-2.5 text-xs text-gray-400">
                  Nema rezultata (klijent mora imati loyalty nalog — nastaje
                  prvom posetom).
                </p>
              )}
            </div>
          )}
        </div>
        <div>
          <label className={lbl}>Tip</label>
          <select
            className={inp}
            value={type}
            onChange={(e) =>
              setType(e.target.value as "percent" | "fixed" | "free_service")
            }
          >
            <option value="percent">Popust (%)</option>
            <option value="fixed">Popust (RSD)</option>
            <option value="free_service">Gratis usluga</option>
          </select>
        </div>
        {type !== "free_service" ? (
          <div>
            <label className={lbl}>
              {type === "percent" ? "Procenat" : "Iznos (RSD)"}
            </label>
            <input
              type="number"
              min={0}
              className={inp}
              value={value}
              onChange={(e) => setValue(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        ) : (
          <div>
            <label className={lbl}>Naziv usluge</label>
            <input
              className={inp}
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            />
          </div>
        )}
        <div>
          <label className={lbl}>Važi (dana)</label>
          <input
            type="number"
            min={1}
            max={365}
            className={inp}
            value={expiresDays}
            onChange={(e) => setExpiresDays(parseInt(e.target.value, 10) || 90)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={issue.isPending}
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition"
        >
          {issue.isPending ? "Izdavanje..." : "Izdaj vaučer 🎁"}
        </button>
      </div>
    </div>
  );
}

export function LoyaltyVouchers() {
  const { data, isLoading } = useLoyaltyAdminVouchers();
  const revoke = useRevokeLoyaltyVoucher();
  const [showIssue, setShowIssue] = useState(false);

  const handleRevoke = async (id: string) => {
    try {
      await revoke.mutateAsync(id);
      toast.success("Vaučer povučen");
    } catch {
      toast.error("Greška pri povlačenju");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowIssue((v) => !v)}
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition"
        >
          {showIssue ? "Zatvori" : "+ Pokloni vaučer"}
        </button>
      </div>

      {showIssue && <IssueForm onDone={() => setShowIssue(false)} />}

      <div className={`${card} overflow-x-auto`}>
        {isLoading ? (
          <div className="p-6">
            <div className="rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse h-32" />
          </div>
        ) : !data?.vouchers?.length ? (
          <p className="text-xs text-gray-400 text-center py-10">
            Još nema vaučera — nastaju automatski kroz nagrade ili ih izdajte
            ručno.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="px-5 py-3">Kod</th>
                <th className="px-3 py-3">Vrednost</th>
                <th className="px-3 py-3">Vlasnik</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Važi do</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {data.vouchers.map((v) => (
                <tr key={v._id}>
                  <td className="px-5 py-3 font-mono font-bold text-violet-700 dark:text-violet-400">
                    {v.code}
                  </td>
                  <td className="px-3 py-3">
                    {v.type === "percent"
                      ? `${v.value}%`
                      : v.type === "fixed"
                        ? `${v.value} RSD`
                        : `Gratis: ${v.serviceName || "usluga"}`}
                  </td>
                  <td className="px-3 py-3">
                    {v.owner?.name ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATUS_COLORS[v.status] ?? "bg-gray-100 text-gray-500"}`}
                    >
                      {STATUS_LABELS[v.status] ?? v.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">
                    {v.expiresAt
                      ? new Date(v.expiresAt).toLocaleDateString("sr-RS")
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {(v.status === "active" || v.status === "reserved") && (
                      <button
                        onClick={() => handleRevoke(v._id)}
                        className="text-xs font-bold text-rose-500 hover:text-rose-700"
                      >
                        Poništi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
