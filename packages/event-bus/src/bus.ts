/**
 * Tanki in-process event bus (T8). Sinhron fan-out, error-izolovan.
 *
 * NIJE generički bus (bez persistencije/queue-a/brokera — to je namerno):
 * durabilnost ostaje odgovornost svakog engine-a (npr. Loyalty ima svoj
 * DB event queue + cron retry). Bus je samo tipizovani cross-engine fan-out.
 *
 * Princip (iz loyalty flow-a): greška subscriber-a se prijavi ali NIKAD ne ruši
 * publisher-a niti druge subscriber-e — "Loyalty ne sme da sruši Booking".
 */
import type {
  EventByType,
  PlatformEvent,
  PlatformEventType,
} from "./contracts";

export type EventHandler<E> = (event: E) => void | Promise<void>;

export type BusErrorReporter = (
  error: unknown,
  context: { type: PlatformEventType },
) => void;

const defaultReporter: BusErrorReporter = (error, ctx) => {
  console.error(`[event-bus] subscriber za "${ctx.type}" pao:`, error);
};

export class EventBus {
  private readonly handlers = new Map<
    PlatformEventType,
    Set<EventHandler<PlatformEvent>>
  >();
  private readonly reportError: BusErrorReporter;

  constructor(reportError: BusErrorReporter = defaultReporter) {
    this.reportError = reportError;
  }

  /**
   * Registruj handler za tip eventa. Vraća unsubscribe funkciju.
   * Handler je tipizovan na tačan event (`EventByType<T>`).
   */
  subscribe<T extends PlatformEventType>(
    type: T,
    handler: EventHandler<EventByType<T>>,
  ): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    // Bezbedan cast: publish poziva handler samo za event čiji `type` se
    // poklapa, pa handler uvek dobije baš svoj (uži) event tip.
    const stored = handler as EventHandler<PlatformEvent>;
    set.add(stored);
    return () => {
      set.delete(stored);
    };
  }

  /**
   * Objavi event svim subscriber-ima za taj tip. Error-izolovano preko
   * allSettled (i sinhroni throw i async reject se hvataju). NIKAD ne baca.
   */
  async publish(event: PlatformEvent): Promise<void> {
    const set = this.handlers.get(event.type);
    if (!set || set.size === 0) return;
    const results = await Promise.allSettled(
      [...set].map((h) => Promise.resolve().then(() => h(event))),
    );
    for (const r of results) {
      if (r.status === "rejected") {
        this.reportError(r.reason, { type: event.type });
      }
    }
  }

  /** Broj subscriber-a za tip (telemetrija/testovi). */
  subscriberCount(type: PlatformEventType): number {
    return this.handlers.get(type)?.size ?? 0;
  }
}
