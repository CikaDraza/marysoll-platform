"use client";

/**
 * Growth Studio — klijentov "Nagrade" tab u panelu.
 * Balans hero (srca progress + poeni), sledeća nagrada, voucher wallet,
 * istorija (ledger verbatim — izvor poverenja).
 */
import {
  useLoyaltyMe,
  useLoyaltyLedger,
  useLoyaltyVouchers,
  formatLoyaltyAmount,
  describeLoyaltyReward,
  type LoyaltyVoucherInfo,
} from "@/hooks/useLoyalty";
import { ShareVoucherCard } from "./ShareVoucherCard";

const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

function VoucherCard({ voucher }: { voucher: LoyaltyVoucherInfo }) {
  const isUsable = voucher.status === "active";
  const label =
    voucher.type === "percent"
      ? `${voucher.value}%`
      : voucher.type === "fixed"
        ? `${voucher.value} RSD`
        : "GRATIS";
  const statusText =
    voucher.status === "active"
      ? voucher.expiresAt
        ? `Važi do ${new Date(voucher.expiresAt).toLocaleDateString("sr-RS")}`
        : "Aktivan"
      : voucher.status === "reserved"
        ? "Rezervisan za termin"
        : "Iskorišćen";

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-4 flex items-center gap-4 ${
        isUsable
          ? "border-violet-300 dark:border-violet-700 bg-violet-50/60 dark:bg-violet-950/30"
          : "border-gray-200 dark:border-gray-700 opacity-60"
      }`}
    >
      <div className="w-14 h-14 rounded-xl bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 flex items-center justify-center text-sm font-black text-violet-700 dark:text-violet-300 flex-shrink-0">
        {label}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
          {voucher.type === "free_service" && voucher.serviceName
            ? voucher.serviceName
            : voucher.type === "percent"
              ? `${voucher.value}% popusta`
              : voucher.type === "fixed"
                ? `${voucher.value} RSD popusta`
                : "Gratis usluga"}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">{statusText}</p>
        <p className="text-xs font-mono font-bold tracking-widest text-violet-600 dark:text-violet-400 mt-1">
          {voucher.code}
        </p>
      </div>
    </div>
  );
}

export default function ClientLoyalty() {
  const { data: me, isLoading } = useLoyaltyMe();
  const hasProgram = Boolean(me?.config);
  const { data: ledger } = useLoyaltyLedger(hasProgram);
  const { data: wallet } = useLoyaltyVouchers(hasProgram);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse h-40" />
        <div className="rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse h-24" />
      </div>
    );
  }

  if (!hasProgram || !me) {
    return (
      <div className={`${card} text-center py-14`}>
        <div className="text-4xl mb-3">💝</div>
        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
          Program nagrađivanja još nije aktivan
        </p>
        <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto">
          Kada salon pokrene program, ovde ćete pratiti svoje nagrade i
          pogodnosti.
        </p>
      </div>
    );
  }

  const hearts = me.config!.currencies.hearts;
  const points = me.config!.currencies.points;
  const account = me.account!;
  const milestone = me.config!.milestone;
  const required = milestone?.heartsRequired ?? 0;
  const remaining = Math.max(0, required - account.heartsBalance);

  const vouchers = wallet?.vouchers ?? [];
  const activeVouchers = vouchers.filter((v) => v.status !== "redeemed");
  const usedVouchers = vouchers.filter((v) => v.status === "redeemed");

  return (
    <div className="space-y-5">
      {!me.enabled && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          Program je trenutno pauziran — vaše stanje je sačuvano.
        </div>
      )}

      {/* ── Streak (niz poseta — navika, QR check-in) ── */}
      {account.checkinStreak >= 1 && (
        <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white p-5 shadow-lg flex items-center gap-4">
          <span className="text-4xl leading-none">🔥</span>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black leading-none">
              {account.checkinStreak}{" "}
              <span className="text-sm font-bold">niz poseta</span>
            </p>
            <p className="text-xs text-amber-50 mt-1.5">
              Ne prekidajte niz — skenirajte QR pri svakom dolasku!
              {account.longestCheckinStreak > account.checkinStreak
                ? ` Rekord: ${account.longestCheckinStreak}.`
                : ""}
            </p>
          </div>
        </div>
      )}

      {/* ── Balans hero ── */}
      <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 text-white p-7 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-6">
          {hearts.enabled && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-violet-200">
                Moja {hearts.nameMany}
              </p>
              {required > 0 ? (
                <>
                  <div className="flex items-center gap-1.5 text-3xl mt-2">
                    {Array.from({ length: required }, (_, i) => (
                      <span
                        key={i}
                        className={
                          i < Math.min(account.heartsBalance, required)
                            ? ""
                            : "opacity-30 grayscale"
                        }
                      >
                        {hearts.emoji}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-violet-100 mt-2.5">
                    {remaining > 0
                      ? `Još ${formatLoyaltyAmount(remaining, hearts)} do nagrade`
                      : "Nagrada vas čeka! 🎉"}
                  </p>
                </>
              ) : (
                <p className="text-3xl font-black mt-2">
                  {account.heartsBalance} {hearts.emoji}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-6">
            {points.enabled && (
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-widest text-violet-200">
                  {points.nameMany} {points.emoji}
                </p>
                <p className="text-3xl font-black mt-1">
                  {account.pointsBalance}
                </p>
              </div>
            )}
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-widest text-violet-200">
                Posete
              </p>
              <p className="text-3xl font-black mt-1">
                {account.completedVisits}
              </p>
            </div>
          </div>
        </div>

        {milestone && (
          <div className="mt-5 pt-4 border-t border-white/20 flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-violet-200">
                Sledeća nagrada
              </p>
              <p className="text-sm font-bold">
                {describeLoyaltyReward(milestone.reward)} — za{" "}
                {formatLoyaltyAmount(required, hearts)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Voucher wallet ── */}
      <div className={card}>
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">
          Moje nagrade
        </h3>
        {activeVouchers.length === 0 && usedVouchers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Još nemate vaučere — sakupljajte {hearts.nameMany}{" "}
            {hearts.emoji} dolascima u salon.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeVouchers.map((v) => (
              <VoucherCard key={v._id} voucher={v} />
            ))}
            {usedVouchers.slice(0, 4).map((v) => (
              <VoucherCard key={v._id} voucher={v} />
            ))}
          </div>
        )}
      </div>

      {/* ── Pozovite prijateljicu (share voucher) ── */}
      {me?.config?.sharing?.enabled && (
        <ShareVoucherCard friendReward={me.config.sharing.friendReward} />
      )}

      {/* ── Istorija ── */}
      <div className={card}>
        <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">
          Istorija
        </h3>
        {!ledger?.entries?.length ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Istorija je prazna — vaša prva poseta donosi prve nagrade.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {ledger.entries.map((e) => {
              const names = e.currency === "hearts" ? hearts : points;
              const emoji = names.emoji;
              return (
                <li
                  key={e._id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">
                      {e.description}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(e.createdAt).toLocaleDateString("sr-RS", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-black flex-shrink-0 ${
                      e.amount > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-500 dark:text-rose-400"
                    }`}
                  >
                    {e.amount > 0 ? "+" : ""}
                    {e.amount} {emoji}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
