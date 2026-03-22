import "server-only";

/**
 * Chat Agent — DeepSeek powered client-facing assistant
 *
 * Replaces the previous Gemini-based askAgent.
 * Fetches salon data from internal DB (no external API calls).
 * Returns a ReadableStream for SSE streaming.
 */

import { callDeepSeek } from "./agents";
import { connectToDB } from "@/lib/db/mongodb";
import { SalonProfile } from "@/models/SalonProfile";
import { Service } from "@/models/Service";
import { Appointment } from "@/models/Appointment";
import type { DeepSeekMessage } from "./agents";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatAgentOptions {
  userInput: string;
  isAuthenticated: boolean;
  history: ChatMessage[];
  userName: string;
  tenantId: string | null;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

async function buildSystemPrompt(tenantId: string | null): Promise<string> {
  await connectToDB();

  const tenantFilter = tenantId ? { tenantId } : {};

  const [services, profile, recentAppointments] = await Promise.all([
    Service.find(tenantFilter).lean(),
    SalonProfile.findOne(tenantFilter).lean(),
    Appointment.find({
      ...tenantFilter,
      status: { $nin: ["appointment_rejected", "appointment_cancelled"] },
      date: {
        $gte: new Date().toISOString().split("T")[0],
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
    })
      .select("date time duration")
      .lean(),
  ]);

  const servicesText =
    services.length > 0
      ? services
          .map((s: Record<string, unknown>) => {
            const variants = Array.isArray(s.variants) ? s.variants : [];
            const variantText =
              variants.length > 0
                ? ` (varijante: ${variants.map((v: Record<string, unknown>) => v.name).join(", ")})`
                : "";
            return `- [ID: ${String(s._id)}] ${String(s.category)} > ${String(s.name)}: ${String(s.basePrice ?? "Na upit")} RSD, trajanje: ${String(s.duration ?? "?")} min${variantText}`;
          })
          .join("\n")
      : "Nema dostupnih usluga.";

  const workingHoursText =
    profile && (profile as Record<string, unknown>).workingHours
      ? Object.entries(
          (profile as Record<string, unknown>).workingHours as Record<
            string,
            unknown
          >,
        )
          .map(([day, config]) => {
            const c = config as Record<string, unknown>;
            return `${day}: ${c.isClosed ? "Neradni dan" : `${String(c.open)} - ${String(c.close)}`}`;
          })
          .join(", ")
      : "Radno vreme nije definisano.";

  const busySlotsText =
    recentAppointments.length > 0
      ? recentAppointments
          .map(
            (app: Record<string, unknown>) =>
              `${String(app.date)}: od ${String(app.time)} do ${calculateEndTime(String(app.time), Number(app.duration))}`,
          )
          .join("; ")
      : "Svi termini su slobodni.";

  const currentDate = new Date().toLocaleDateString("sr-RS", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const salonName = profile
    ? String((profile as Record<string, unknown>).name ?? "Salon")
    : "Salon";
  const salonPhone = profile
    ? String((profile as Record<string, unknown>).phone ?? "")
    : "";
  const salonCity = profile
    ? String((profile as Record<string, unknown>).city ?? "")
    : "";

  return `
# IDENTITET
Ti si AI asistent salona "${salonName}". NISi nezavisni AI — ti si glas ovog salona.

# PODACI O SALONU
- Naziv: ${salonName}
- Lokacija: ${salonCity}
- Kontakt: ${salonPhone}
- Radno vreme: ${workingHoursText}
- Danas je: ${currentDate}

# USLUGE I CENE
${servicesText}

# ZAUZETI TERMINI (naredna 3 dana)
${busySlotsText}

# REGISTAR BLOKOVA
Kada korisnik želi akciju, u odgovoru OBAVEZNO dodaj JSON blok na kraju:
{"block": "AppointmentCalendarBlock", "metadata": {"serviceId": "...", "serviceName": "...", "date": "YYYY-MM-DD", "time": "HH:mm"}}
{"block": "AuthBlock", "metadata": {"mode": "login|register|logout|forgot|reset"}}
{"block": "CalendarBlock", "metadata": {"mode": "list|preview"}}
{"block": "ServicePriceBlock", "metadata": {}}
{"block": "TestimonialBlock", "metadata": {}}

# PRAVILA
1. Odgovaraj na srpskom, profesionalno, ženski rod.
2. Za zakazivanje — proveri zauzete termine pre predloga.
3. Nikada ne izmišljaj informacije van knowledge baze.
4. Ako korisnik nije ulogovan a želi zakazivanje → AuthBlock(login).
5. Odgovori moraju biti prirodni, bez tehničkih labela.
6. JSON blok ide NA KRAJU odgovora, nikada u sredini.
`;
}

export async function askChatAgent(
  options: ChatAgentOptions,
): Promise<ReadableStream<Uint8Array>> {
  const { userInput, history, userName, tenantId, isAuthenticated } = options;

  const systemPrompt = await buildSystemPrompt(tenantId);

  const messages: DeepSeekMessage[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\nStatus korisnika: ${isAuthenticated ? `Prijavljen kao: ${userName}` : "Gost (nije prijavljen)"}`,
    },
    ...history.slice(-8).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: userInput },
  ];

  const response = await callDeepSeek({
    agent: "chat",
    messages: messages.slice(1), // system is first
    systemPrompt: messages[0].content,
    stream: true,
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  return response.body as ReadableStream<Uint8Array>;
}
