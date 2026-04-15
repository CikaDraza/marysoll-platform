// components/NotificationSettings.tsx
"use client";

import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Loader from "../elements/Loader";

const inp = [
  "border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";
const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

export default function NotificationSettings() {
  const { user } = useAuth();
  const {
    settings,
    isLoading,
    saveMutation,
    testEmailMutation,
    toggleSetting,
    updateSetting,
    sendTestEmail,
  } = useNotificationSettings();
  const [testType, setTestType] = useState("appointment-created");

  if (isLoading) {
    return <Loader />;
  }

  const isAdmin = user?.isAdmin || false;

  return (
    <div className="py-6">

      {/* Naslov zavisno od uloge */}
      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        {isAdmin ? "Postavke notifikacija" : "Moje postavke notifikacija"}
      </h3>

      <div className="space-y-8">
        {/* Globalne postavke - ZA SVE */}
        <div>
          <h4 className={lbl}>Globalne postavke</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NotificationToggle
              label="Email notifikacije"
              description="Primajte obaveštenja putem email-a"
              checked={settings.emailNotifications}
              onChange={() => toggleSetting("emailNotifications")}
            />
            <NotificationToggle
              label="Push notifikacije"
              description="Obaveštenja na browser-u"
              checked={settings.pushNotifications}
              onChange={() => toggleSetting("pushNotifications")}
            />
            <NotificationToggle
              label="Browser notifikacije"
              description="Desktop obaveštenja"
              checked={settings.browserNotifications}
              onChange={() => toggleSetting("browserNotifications")}
            />
          </div>
        </div>

        {/* Postavke za termine - RAZLIČITO ZA ADMINA I KLIJENTA */}
        <div>
          <h4 className={lbl}>
            {isAdmin
              ? "Notifikacije za termine"
              : "Notifikacije za moje termine"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ADMIN VIDI OVO */}
            {isAdmin && (
              <>
                <NotificationToggle
                  label="Novi termin"
                  description="Kada klijent zakaze novi termin"
                  checked={settings.appointmentCreated}
                  onChange={() => toggleSetting("appointmentCreated")}
                />
                <NotificationToggle
                  label="Email za poruke (Chat)"
                  description="Šalji email za nove poruke u chatu"
                  checked={settings.appointmentMessageEmail}
                  onChange={() => toggleSetting("appointmentMessageEmail")}
                />
              </>
            )}

            {/* KLIJENT VIDI OVO */}
            {!isAdmin && (
              <>
                <NotificationToggle
                  label="Potvrda termina"
                  description="Kada salon potvrdi vaš termin"
                  checked={settings.appointmentApproved}
                  onChange={() => toggleSetting("appointmentApproved")}
                />
                <NotificationToggle
                  label="Odbijanje termina"
                  description="Kada salon odbije vaš termin"
                  checked={settings.appointmentRejected}
                  onChange={() => toggleSetting("appointmentRejected")}
                />
                <NotificationToggle
                  label="Pomeranje termina"
                  description="Kada salon pomera vaš termin"
                  checked={settings.appointmentRescheduled}
                  onChange={() => toggleSetting("appointmentRescheduled")}
                />
                <NotificationToggle
                  label="Otkazivanje termina"
                  description="Kada salon otkaže vaš termin"
                  checked={settings.appointmentCancelled}
                  onChange={() => toggleSetting("appointmentCancelled")}
                />
                <NotificationToggle
                  label="Email za poruke"
                  description="Šalji email za nove poruke od salona"
                  checked={settings.appointmentMessageEmail}
                  onChange={() => toggleSetting("appointmentMessageEmail")}
                />
              </>
            )}

            {/* ZAJEDNIČKO ZA SVE */}
            <NotificationToggle
              label={isAdmin ? "Sistemske notifikacije" : "Poruke od salona"}
              description={
                isAdmin
                  ? "Notifikacije za poruke u sistemu"
                  : "Notifikacije za poruke u sistemu"
              }
              checked={settings.appointmentMessage}
              onChange={() => toggleSetting("appointmentMessage")}
            />

            <NotificationToggle
              label="Podsetnik za termin"
              description="Automatski podsetnik pre termina"
              checked={settings.appointmentReminder}
              onChange={() => toggleSetting("appointmentReminder")}
            />
          </div>

          {settings.appointmentReminder && (
            <div className="mt-8">
              <label className={lbl + " mb-3"}>
                Koliko sati pre termina da se pošalje podsetnik?
              </label>
              <div className="flex items-center space-x-4">
                <select
                  value={settings.reminderHours}
                  onChange={(e) =>
                    updateSetting("reminderHours", parseInt(e.target.value))
                  }
                  className={inp}
                  disabled={saveMutation.isPending}
                >
                  <option value="1">1 sat</option>
                  <option value="3">3 sata</option>
                  <option value="6">6 sati</option>
                  <option value="12">12 sati</option>
                  <option value="24">24 sata</option>
                  <option value="48">48 sati</option>
                </select>
                <span className={lbl}>pre početka termina</span>
              </div>
            </div>
          )}
        </div>

        {/* Postavke za preporuke - RAZLIČITO ZA ADMINA I KLIJENTA */}
        <div>
          <h4 className={lbl}>
            {isAdmin
              ? "Notifikacije za preporuke"
              : "Notifikacije za moje preporuke"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ADMIN VIDI OVO */}
            {isAdmin && (
              <>
                <NotificationToggle
                  label="Nova preporuka"
                  description="Kada klijent ostavi preporuku"
                  checked={settings.testimonialCreated}
                  onChange={() => toggleSetting("testimonialCreated")}
                />
                <NotificationToggle
                  label="Preporuka ažurirana"
                  description="Kada klijent izmeni preporuku"
                  checked={settings.testimonialUpdated}
                  onChange={() => toggleSetting("testimonialUpdated")}
                />
                <NotificationToggle
                  label="Preporuka obrisana"
                  description="Kada se preporuka obriše"
                  checked={settings.testimonialDeleted}
                  onChange={() => toggleSetting("testimonialDeleted")}
                />
              </>
            )}

            {/* KLIJENT VIDI OVO */}
            {!isAdmin && (
              <>
                <NotificationToggle
                  label="Odgovor na preporuku"
                  description="Kada salon odgovori na vašu preporuku"
                  checked={settings.testimonialReplied}
                  onChange={() => toggleSetting("testimonialReplied")}
                />
                <NotificationToggle
                  label="Izmena preporuke"
                  description="Kada izmenite vašu preporuku"
                  checked={settings.testimonialUpdated}
                  onChange={() => toggleSetting("testimonialUpdated")}
                />
                <NotificationToggle
                  label="Brisanje preporuke"
                  description="Kada obrišete vašu preporuku"
                  checked={settings.testimonialDeleted}
                  onChange={() => toggleSetting("testimonialDeleted")}
                />
              </>
            )}

            {/* ZAJEDNIČKO */}
            <NotificationToggle
              label="Sistemske poruke"
              description="Ostale poruke o preporukama"
              checked={settings.testimonialMessage}
              onChange={() => toggleSetting("testimonialMessage")}
            />
          </div>

          {/* Info blok zavisno od uloge */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Napomena:</strong>
              {isAdmin
                ? " Email notifikacije za preporuke se šalju adminima kada se desi neki događaj (nova preporuka, izmena, brisanje). Klijent dobija email samo kada salon odgovori na njegovu preporuku."
                : " Kada ostavite novu preporuku, salon će automatski dobiti notifikaciju (ne možete ovo isključiti)."}
            </p>
          </div>
        </div>

        {/* Newsletter postavke (opciono) */}
        <div>
          <h4 className={lbl}>Newsletter postavke</h4>
          <p className="text-sm text-gray-600 mb-6">
            Primajte promocije, novosti i korisne savete direktno na email.
            Možete birati koje vrste sadržaja želite.
          </p>
          {/* Glavni toggle za pretplatu */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mt-1 transition-colors">
                  {settings.newsletterPromotions ||
                  settings.newsletterUpdates ||
                  settings.newsletterTips ? (
                    "Trenutno primate odabrane vrste emailova"
                  ) : (
                    <span className="text-(--secondary-color) transition-colors">
                      Trenutno niste pretplaćeni ni na jedan bilten
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NotificationToggle
              label="Promocije i ponude"
              description="Dobijajte specijalne ponude i popuste"
              checked={settings.newsletterPromotions || false}
              onChange={() => toggleSetting("newsletterPromotions")}
            />
            <NotificationToggle
              label="Novosti i ažuriranja"
              description="Budite informisani o novim uslugama"
              checked={settings.newsletterUpdates || false}
              onChange={() => toggleSetting("newsletterUpdates")}
            />
            <NotificationToggle
              label="Saveti i trendovi"
              description="Korisni saveti i beauty trendovi"
              checked={settings.newsletterTips || false}
              onChange={() => toggleSetting("newsletterTips")}
            />
          </div>
        </div>

        {/* Akcije */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-300">
          <div className="sm:col-span-2">
            <label htmlFor="phone-number" className={lbl}>
              Test mailing
            </label>
            <div className="mt-2.5">
              <div className="flex rounded-md bg-white/5 outline-1 -outline-offset-1 outline-white/10 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-(--secondary-color)">
                <div className="grid shrink-0 grid-cols-1 focus-within:relative">
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="cursor-pointer col-start-1 row-start-1 w-full appearance-none rounded-l-md bg-green-600 text-white py-2 pr-1 pl-3.5"
                  >
                    <option value="appointment-created">Termin zakazan</option>
                    <option value="appointment-approved">Termin odobren</option>
                    <option value="appointment-rejected">Termin odbijen</option>
                    <option value="appointment-rescheduled">
                      Termin pomeren
                    </option>
                    <option value="appointment-cancelled">
                      Termin otkazan
                    </option>

                    <option value="testimonial-created">Testimonial</option>

                    <option value="newsletter-promotions">
                      Newsletter promocija
                    </option>

                    <option value="email-verification">
                      Email verifikacija
                    </option>
                  </select>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="cursor-pointer text-white col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-50 sm:size-4"
                  />
                </div>
                <button
                  onClick={() => sendTestEmail(testType)}
                  disabled={testEmailMutation.isPending}
                  className="cursor-pointer px-6 py-3 bg-green-600 text-white rounded-r-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {testEmailMutation.isPending
                    ? "Slanje..."
                    : "Pošalji test email"}
                </button>
              </div>
            </div>
          </div>

          <div className="text-sm text-(--secondary-color)">
            {saveMutation.isPending && "Čuvanje..."}
            {saveMutation.isSuccess && "✓ Sačuvano"}
            {saveMutation.isError && "✗ Greška"}
          </div>
        </div>
      </div>
    </div>
  );
}

// NotificationToggle komponenta ostaje ista
function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className={`${card} flex items-center justify-between`}>
      <div>
        <p className={lbl}>{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-(--secondary-color)" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
