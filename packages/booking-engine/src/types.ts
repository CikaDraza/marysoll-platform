/**
 * Availability contract.
 *
 * Engine NE zna: Service, Consultation, EducationSession, Appointment, tema,
 * salon, cena. Zna samo raspored, pauze, odmore, zauzetost i trajanje. Ko god
 * ume da kaže „koliko traje" i „nad kojim resursom" ulazi kroz isti ugovor:
 *
 *   Service              ─┐
 *   ConsultationOffering ─┼─→ duration + resourceKey → AvailabilityQuery
 *   EducationSession     ─┘
 *
 * Sve vreme je EKSPLICITNO: lokalni dan + IANA zona ulaze u upit, a rezultat
 * nosi i lokalne stringove i UTC instante. Bez toga „prošlo vreme" i DST dan
 * ne mogu da se izračunaju tačno na serveru koji radi u UTC-u.
 */

/** "HH:MM" u 24h formatu. Kraj dana sme biti "24:00". */
export type LocalTime = string;

/** "YYYY-MM-DD". */
export type LocalDate = string;

/** 0 = nedelja … 6 = subota — isto kao `Date#getDay()`. */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Opseg unutar jednog dana, half-open `[from, to)`. */
export interface TimeRange {
  from: LocalTime;
  to: LocalTime;
}

/**
 * Odmor. Datumi su UKLJUČIVI na oba kraja (`from` = prvi, `to` = poslednji dan).
 * Bez `fromTime`/`toTime` odmor pokriva ceo dan; sa njima seče samo taj deo
 * prvog odnosno poslednjeg dana.
 */
export interface VacationRange {
  from: LocalDate;
  to: LocalDate;
  fromTime?: LocalTime;
  toTime?: LocalTime;
}

/** Ručno definisan termin — salon sam bira vreme i trajanje. */
export interface ManualSlot {
  time: LocalTime;
  durationMinutes?: number;
}

/**
 * Zauzeto vreme, kao INSTANT (ne lokalni string). Status zapisa je domenski
 * pojam i ne ulazi ovde — pozivalac prosleđuje samo ono što stvarno blokira.
 */
export interface Occupancy {
  startsAt: Date;
  endsAt: Date;
}

/** Klasifikacija koju Pricing/Loyalty dobijaju kao GOTOVU činjenicu (T3). */
export type AvailabilityClass = "standard" | "extended" | "exceptional";

/** Opseg dana koji nosi klasu — npr. 18:00–21:00 je `extended`. */
export interface AvailabilityBand extends TimeRange {
  class: AvailabilityClass;
}

export interface AvailabilityQuery {
  tenantId: string;
  /** Nad čim se rezerviše (kabina, edukator, sala). Engine ga samo prenosi. */
  resourceKey: string;
  localDate: LocalDate;
  /** IANA zona, npr. "Europe/Belgrade". Obavezna — nema podrazumevane. */
  timezone: string;
  durationMinutes: number;

  /** Radni opsezi po danu u nedelji. Dan koji nedostaje = neradan. */
  schedule?: Partial<Record<WeekdayIndex, TimeRange[]>>;
  /** Pauze — oduzimaju se od rasporeda, ne spajaju se sa njim. */
  breaks?: Partial<Record<WeekdayIndex, TimeRange[]>>;
  vacations?: VacationRange[];

  /**
   * Režim ručnih termina: kada je prisutno (i neprazno), ponuda su TAČNO ovi
   * termini — raspored i korak se ne koriste. Odmori i zauzetost i dalje važe.
   */
  manualSlots?: ManualSlot[];

  occupancies?: Occupancy[];

  /** Razmak između ponuđenih početaka. Default 30. */
  stepMinutes?: number;
  /** Trenutak „sada". Kada je zadat, prošli termini se izostavljaju. */
  now?: Date;

  /** Bez opsega je sve `standard` — klasifikacija je konfiguracija salona. */
  bands?: AvailabilityBand[];
  /** Van ovih sati termin nosi `outsidePreferredHours: true`. */
  preferredHours?: TimeRange[];
}

export interface AvailabilitySlot {
  startsAt: Date;
  endsAt: Date;
  localStart: LocalTime;
  localEnd: LocalTime;
  availabilityClass: AvailabilityClass;
  outsidePreferredHours: boolean;
}

export interface AvailabilityResult {
  date: LocalDate;
  timezone: string;
  slots: AvailabilitySlot[];
}
