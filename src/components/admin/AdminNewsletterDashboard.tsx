// components/admin/AdminNewsletterDashboard.tsx
"use client";

import { useState, useRef } from "react";
import { useNewsletterAdmin } from "@/hooks/useNewsletterAdmin";
import { INewsletterCampaign, INewsletterTemplate } from "@/types";
import toast, { Toaster } from "react-hot-toast";
import { format } from "date-fns";
import Loader from "../elements/Loader";
import { cleanEmailHtml } from "@/lib/htmlUtils";
import AINewsletterTemplateGenerator from "./AINewsletterTemplateGenerator";
import { useNewsletterTemplates } from "@/hooks/useNewsletterTemplates";
import { defaultNewsletterTemplates } from "@/lib/defaultNewsletterTemplates";
import { useNewsletterSubscribers } from "@/hooks/useNewsletterSubscribers";
import { standardNewsletterVariables } from "@/lib/standardNewsletterVariables";
import { extractVariablesFromHtml } from "@/lib/templateUtils";
import {
  formatDatePretty,
  formatDateTimePretty,
} from "@/helpers/formatISODate";
import { SingleImageField } from "./campaign/SingleImageField";
import LoaderButton from "../elements/LoaderButton";
import AdminSemanticModal from "./campaign/AdminSemanticModal";

const inp = [
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm",
  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800",
  "focus:outline-none focus:ring-2 focus:ring-violet-400 transition",
  "placeholder:text-gray-400 dark:placeholder:text-gray-500",
].join(" ");

const lbl =
  "block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5";
const card =
  "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6";

const statusBadgeStyles: Record<INewsletterCampaign["status"], string> = {
  draft: "bg-gray-100 text-gray-800",
  scheduled: "bg-purple-100 text-purple-800",
  sending: "bg-blue-100 text-blue-800",
  paused: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  stopped: "bg-red-100 text-red-800",
};

export default function AdminNewsletterDashboard() {
  const {
    createTemplate,
    isCreatingTemplate,
    updateTemplate,
    isUpdatingTemplate,
    deleteTemplate,
    isDeletingTemplate,
  } = useNewsletterTemplates();
  const {
    templates,
    campaigns,
    isLoading,
    isError,
    createCampaign,
    isCreating,
    sendCampaign,
    pauseCampaign,
    resumeCampaign,
    deleteCampaign,
    stopCampaign,
    isSending,
    isPausing,
    isResuming,
    isStopping,
    isDeleting,
  } = useNewsletterAdmin();

  const {
    subscribers,
    selected,
    isLoadingUser,
    search,
    setSearch,
    toggleSubscriber,
    toggleAll,
    clearSelection,
    hasSelection,
    page,
    setPage,
    pages,
  } = useNewsletterSubscribers();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    templateId: "",
    subject: "",
    content: "", // ovde možeš staviti default HTML iz templejta
    previewText: "",
    sendToAll: true,
    excludeRecentSubscribers: false,
    excludeInactive: false,
    scheduledFor: "", // ISO string
    variables: {} as Record<string, string>,
  });
  const [selectedTemplate, setSelectedTemplate] =
    useState<INewsletterTemplate | null>(null);
  const [customHtmlInput, setCustomHtmlInput] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isVariable, setIsVariable] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [previewCampaign, setPreviewCampaign] =
    useState<INewsletterCampaign | null>(null);
  const [semanticCampaign, setSemanticCampaign] =
    useState<INewsletterCampaign | null>(null);

  const defaultTemplates = defaultNewsletterTemplates;

  const replaceVariables = (
    html: string,
    variables: Record<string, string>,
  ): string => {
    return html.replace(/{{([^}]+)}}/g, (match, key) => {
      const trimmedKey = key.trim();
      let value = variables[trimmedKey] || "";

      // Posebna obrada za datume
      if (trimmedKey === "startEvent" || trimmedKey.includes("DateTime")) {
        value = formatDateTimePretty(value);
      } else if (
        trimmedKey.includes("Date") ||
        trimmedKey.includes("startDate") ||
        trimmedKey.includes("endDate")
      ) {
        value = formatDatePretty(value);
      }

      return value || match;
    });
  };

  const handleTemplateSelect = (
    template: Omit<INewsletterTemplate, "_id" | "createdAt" | "updatedAt"> & {
      _id?: string;
    },
  ) => {
    const html = template.htmlTemplate || previewHtml || "";

    // Automatski izvuci varijable iz HTML-a
    const variables = extractVariablesFromHtml(
      html,
      standardNewsletterVariables,
    );

    const initialVariables = variables.reduce(
      (acc, v) => ({
        ...acc,
        [v.name]: "",
      }),
      {} as Record<string, string>,
    );

    const renderedContent = replaceVariables(html, initialVariables);

    setSelectedTemplate({
      ...template,
      _id: template._id || "",
      variables,
    });

    setFormData({
      ...formData,
      subject: template.subject || "",
      content: renderedContent,
      variables: initialVariables,
    });

    setIsFormOpen(true);

    // scroll do forme
    setTimeout(() => {
      document.getElementById("selected-template")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const updateVariable = (name: string, value: string) => {
    const newVariables = { ...formData.variables, [name]: value };
    setFormData({
      ...formData,
      variables: newVariables,
      content: replaceVariables(
        selectedTemplate?.htmlTemplate || "",
        newVariables,
      ),
    });
    const emailHtml = replaceVariables(
      selectedTemplate?.htmlTemplate || "",
      newVariables,
    );
    const cleaned = cleanEmailHtml(emailHtml);
    setPreviewHtml(cleaned);
  };

  const handleCustomImport = () => {
    const cleaned = cleanEmailHtml(customHtmlInput);
    if (!cleaned) {
      toast.error("HTML je prazan ili nevažeći");
      return;
    }
    setPreviewHtml(cleaned);
    setFormData({
      ...formData,
      content: cleaned,
    });
    toast.success("Custom templejt učitan – sačuvaj ga ako želiš");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const cleaned = cleanEmailHtml(content);
      setCustomHtmlInput(cleaned);
      setPreviewHtml(cleaned);
      toast.success("Datoteka učitana");
    };
    reader.readAsText(file);
  };

  const handleSaveCustomTemplate = async () => {
    if (!previewHtml) {
      toast.error("Nema templejta za čuvanje");
      return;
    }

    const name = prompt("Unesi naziv templejta:");
    if (!name?.trim()) return;

    const slug = prompt("Unesi jedinstveni slug (npr. my-summer-promo):");
    if (!slug?.trim()) return;

    const subject =
      prompt("Unesi default subject:", "Nova promocija iz Marysoll salona") ||
      "Newsletter";

    // Uzmi definiciju varijabli iz standarda
    const variableDefinitions = standardNewsletterVariables.map((def) => ({
      name: def.name,
      label: def.label,
      type: def.type,
      placeholder: def.placeholder,
      required: def.required || false,
      defaultValue: formData.variables[def.name] || def.defaultValue || "", // uzmi unešenu vrednost ili originalni default
    }));

    createTemplate({
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      subject,
      htmlTemplate: previewHtml,
      isActive: true,
      hasVariables: isVariable,
      variables: variableDefinitions,
    });

    // Reset
    setCustomHtmlInput("");
    setPreviewHtml(null);
    setIsVariable(false);
  };

  const updateSelectAllIndeterminate = () => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        hasSelection && selected.length < subscribers.length;
    }
  };

  const handleCreate = (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!selectedTemplate) {
      toast.error("Morate izabrati templejt");
      return;
    }

    if (!formData.name || !formData.subject || !formData.content) {
      toast.error("Molimo popunite obavezna polja");
      return;
    }

    // Filtriramo varijable: Popunjavamo samo one koje NISU dinamičke
    const staticVariables = { ...formData.variables };

    // OVE VARIJABLE NAMERNO BRIŠEMO iz procesa zamene u dashboard-u
    // da bi ostale kao {{placeholder}} za backend
    const dynamicKeys = ["clientName", "unsubscribeUrl", "ctaLink"];
    dynamicKeys.forEach((key) => delete staticVariables[key]);

    const finalContent = replaceVariables(
      selectedTemplate?.htmlTemplate || formData.content || "",
      staticVariables, // Menjamo samo npr. discount, slike, datume
    );

    const cleanCtaSlug = (formData.variables.ctaSlug || "/termini")
      .replace(/^\/+/, "") // ukloni sve leading slash-ove
      .replace(/\/+$/, "") // ukloni trailing slash-ove (ako ih ima)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    createCampaign({
      name: formData.name,
      templateId: selectedTemplate.isDefault ? null : selectedTemplate._id,
      defaultTemplateSlug: selectedTemplate?.isDefault
        ? selectedTemplate.slug
        : null,
      subject: formData.subject,
      previewText: formData.previewText,
      content: finalContent, // OVO JE NAJVAŽNIJE!
      manualRecipients: formData.sendToAll ? [] : selected,
      sendToAll: formData.sendToAll,
      excludeRecentSubscribers: formData.excludeRecentSubscribers,
      excludeInactive: formData.excludeInactive,
      scheduledFor: formData.scheduledFor
        ? new Date(formData.scheduledFor)
        : undefined,
      ctaSlug: cleanCtaSlug || "termini",
    });
    if (isError) {
      return;
    }
    // Reset
    setFormData({
      name: "",
      templateId: "",
      subject: "",
      content: "",
      previewText: "",
      sendToAll: true,
      excludeRecentSubscribers: false,
      excludeInactive: false,
      scheduledFor: "",
      variables: {},
    });
    setSelectedTemplate(null);
    setIsFormOpen(false);
  };

  const handleUpdateTemplate = () => {
    // Provera da li uopšte imamo šta da ažuriramo
    if (!selectedTemplate?._id || !customHtmlInput) {
      toast.error("Niste izabrali templejt za izmenu ili je HTML prazan.");
      return;
    }

    // Priprema definicija varijabli sa trenutnim vrednostima iz input polja
    const variableDefinitions = standardNewsletterVariables.map((def) => ({
      name: def.name,
      label: def.label,
      type: def.type,
      defaultValue: formData.variables[def.name] || def.defaultValue || "",
      required: def.required || false,
    }));

    try {
      // Poziv update mutacije
      updateTemplate({
        id: selectedTemplate._id,
        name: selectedTemplate.name, // Zadržavamo postojeće ime
        htmlTemplate: customHtmlInput, // Novi HTML kod sa {{}} tagovima
        hasVariables: isVariable,
        variables: variableDefinitions,
      });

      // Čišćenje nakon uspešnog ažuriranja
      setCustomHtmlInput("");
      setPreviewHtml(null);
      setSelectedTemplate(null);
      setIsVariable(false);
    } catch (error) {
      console.error("Greška pri ažuriranju:", error);
    }
  };

  const handleSend = (campaignId: string, campaignName: string) => {
    if (
      confirm(
        `Da li ste sigurni da želite da pokrenete kampanju "${campaignName}"?`,
      )
    ) {
      sendCampaign(campaignId);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div>
      <Toaster position="top-right" />
      {/* ===== NEWSLETTER EMAIL TEMPLATES SEKCIJA ===== */}
      <div className="mb-12">
        <div className="flex flex-col items-start gap-6 mb-8">
          <div className={`${card} w-full flex-1`}>
            <h2 className="text-2xl! lg:text-4xl! font-bold mb-4">
              Newsletter Email Kampanje
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
              Ovde upravljate email kampanjama. Sistem dolazi sa{" "}
              <strong>default templejtima </strong>
              (promocije, novosti, saveti, rođendani...), ali možete kreirati i{" "}
              <strong>custom templejte</strong> putem AI asistenta ili importom
              gotovog HTML koda.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Svi templejti se automatski wrap-uju u standardni header/footer sa
              logom, adresom i unsubscribe linkom.
            </p>
          </div>

          <div className="flex flex-1 w-full flex-col sm:flex-row gap-4 mt-6 lg:mt-0">
            <AINewsletterTemplateGenerator
              onTemplateGenerated={(html) => {
                const cleaned = cleanEmailHtml(html);
                setCustomHtmlInput(cleaned);
                setPreviewHtml(cleaned);
                toast.success(
                  "AI templejt generisan – sačuvaj ga ili koristi u kampanji",
                );
              }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:hover:border-gray-300"
            >
              📄 Importuj HTML datoteku
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
        {/* Default templejti grid */}
        <div className={`${card} mb-4`}>
          <h3 className="text-lg lg:text-xl font-bold">Default Templejti:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
            {defaultTemplates.map((template) => (
              <div key={template.slug} className={`${card}`}>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">{template.name}</h4>
                    <p className="text-sm text-gray-600">{template.slug}</p>
                  </div>
                  <button
                    className="text-sm text-blue-600 hover:text-blue-600 cursor-pointer"
                    onClick={() => {
                      handleTemplateSelect(template);
                      setCustomHtmlInput(template.htmlTemplate);
                      setPreviewHtml(
                        replaceVariables(template.htmlTemplate, {
                          ...(template.variables || []).reduce(
                            (acc, v) => ({
                              ...acc,
                              [v.name]: v.defaultValue || "",
                            }),
                            {} as Record<string, string>,
                          ),
                        }),
                      );
                      setTimeout(() => {
                        const element = document.getElementById(
                          "custom-html-template",
                        );
                        if (element) {
                          element.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }
                      }, 100);
                    }}
                  >
                    Izmeni
                  </button>
                </div>
                <div className="h-64 bg-white">
                  <iframe
                    srcDoc={template.htmlTemplate}
                    className="w-full h-full border-0"
                    title={`Preview ${template.name}`}
                    sandbox="allow-same-origin"
                  />
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-950 flex justify-between items-center">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      template.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {template.isActive ? "Aktivan" : "Neaktivan"}
                  </span>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleTemplateSelect(template)}
                      className="text-sm text-(--primary-color) dark:text-gray-300 hover:underline cursor-pointer"
                    >
                      Koristi u kampanji →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Custom templejti grid */}
        {templates.length > 0 && (
          <div className={`${card} mb-4`}>
            <h3 className="text-lg lg:text-xl font-bold">
              Sačuvani Templejti:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-8">
              {templates.map((template) => (
                <div
                  key={template._id}
                  className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-sm text-blue-600 hover:text-blue-600 cursor-pointer"
                        onClick={() => {
                          handleTemplateSelect(template);
                          setCustomHtmlInput(template.htmlTemplate);
                          setPreviewHtml(
                            replaceVariables(template.htmlTemplate, {
                              ...(template.variables || []).reduce(
                                (acc, v) => ({
                                  ...acc,
                                  [v.name]: v.defaultValue || "",
                                }),
                                {} as Record<string, string>,
                              ),
                            }),
                          );
                          setTimeout(() => {
                            const element = document.getElementById(
                              "custom-html-template",
                            );
                            if (element) {
                              element.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }
                          }, 100);
                        }}
                      >
                        Izmeni
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Da li ste sigurni da želite da obrišete templejt "${template.name}"?`,
                            )
                          ) {
                            deleteTemplate(template._id);
                          }
                        }}
                        disabled={isDeleting}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 cursor-pointer"
                      >
                        {isDeletingTemplate ? "Brisanje..." : "Obriši"}
                      </button>
                    </div>
                  </div>
                  <div className="h-64 bg-white">
                    <iframe
                      srcDoc={template.htmlTemplate}
                      className="w-full h-full border-0"
                      title={`Preview ${template.name}`}
                      sandbox="allow-same-origin"
                    />
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-950 flex justify-between items-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        template.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {template.isActive ? "Aktivan" : "Neaktivan"}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        template.hasVariables
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {template.hasVariables
                        ? "Sa varijablama"
                        : "Fiksni templejt"}
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleTemplateSelect(template)}
                        className="text-sm text-(--secondary-color) dark:text-gray-300 hover:underline cursor-pointer"
                      >
                        Koristi u kampanji →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTemplate && (
          <div id="selected-template" className={`${card}`}>
            <h3 className="text-xl font-semibold mb-4">
              Popunite varijable za &quot;{selectedTemplate.name}&quot;
            </h3>

            <p className="text-sm text-gray-600 mb-6">
              Sva polja su opcionalna. Ako ostavite prazno, koristiće se
              podrazumevana vrednost ili će placeholder ostati vidljiv u
              preview-u.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedTemplate.variables.map((variable) => {
                const isClientName = variable.name === "clientName";
                const hasCta = selectedTemplate.variables.some(
                  (v) => v.name === "ctaText" || v.name === "trackingCtaUrl",
                );

                const isImageField =
                  variable.type === "image" ||
                  variable.name.toLowerCase().includes("image");

                // Prikaži ctaSlug samo ako postoji CTA
                if (variable.name === "ctaSlug" && !hasCta) {
                  return null;
                }

                return (
                  <div
                    className={isImageField ? "md:col-span-2" : ""}
                    key={variable.name}
                  >
                    <label className={`${lbl}`}>
                      {variable.label}
                      {isClientName && (
                        <span className="ml-2 text-xs text-blue-600 font-normal">
                          (automatski popunjeno prilikom slanja)
                        </span>
                      )}
                    </label>
                    {isImageField ? (
                      <SingleImageField
                        value={formData.variables?.[variable.name]}
                        onChange={(url) => updateVariable(variable.name, url)}
                        label={variable.label}
                      />
                    ) : variable.type === "textarea" ? (
                      <textarea
                        value={
                          isClientName
                            ? "Automatski: ime primaoca"
                            : formData.variables?.[variable.name] ||
                              variable.defaultValue ||
                              ""
                        }
                        onChange={(e) =>
                          !isClientName &&
                          updateVariable(variable.name, e.target.value)
                        }
                        placeholder={variable.placeholder}
                        disabled={isClientName}
                        className={`w-full p-3 border rounded-lg resize-none ${
                          isClientName
                            ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300"
                            : "border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        }`}
                        rows={4}
                      />
                    ) : variable.type === "date" ? (
                      <input
                        type="date"
                        value={
                          formData.variables?.[variable.name] ||
                          variable.defaultValue ||
                          ""
                        }
                        onChange={(e) =>
                          !isClientName &&
                          updateVariable(variable.name, e.target.value)
                        }
                        disabled={isClientName}
                        className={`w-full p-3 border rounded-lg ${
                          isClientName
                            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                            : "border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        }`}
                      />
                    ) : variable.type === "datetime-local" ? (
                      <input
                        type="datetime-local"
                        value={formData.variables?.[variable.name] || ""}
                        onChange={(e) =>
                          updateVariable(variable.name, e.target.value)
                        }
                        disabled={isClientName}
                        className={`w-full p-3 border rounded-lg ${
                          isClientName
                            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                            : "border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        }`}
                      />
                    ) : (
                      <input
                        type={variable.type === "url" ? "url" : "text"}
                        value={
                          isClientName
                            ? "Automatski: ime primaoca"
                            : formData.variables?.[variable.name] ||
                              variable.defaultValue ||
                              ""
                        }
                        onChange={(e) =>
                          !isClientName &&
                          updateVariable(variable.name, e.target.value)
                        }
                        disabled={isClientName}
                        placeholder={variable.placeholder}
                        className={`w-full p-3 border rounded-lg ${
                          isClientName
                            ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300"
                            : "border-gray-300 dark:border-gray-700 focus:ring-2 focus:outline-none focus:ring-pink-500 focus:border-transparent"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
              {/* Dodaj ctaSlug ručno ako postoji CTA */}
              {selectedTemplate.variables.some(
                (v) => v.name === "ctaText" || v.name === "trackingCtaUrl",
              ) && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Slug dugmeta (putanja na sajtu)
                  </label>
                  <input
                    type="text"
                    value={formData.variables?.ctaSlug ?? ""}
                    onChange={(e) => updateVariable("ctaSlug", e.target.value)}
                    placeholder="npr. termini, manikir, promo-makeup"
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Primer: /termini → vodi na https://marysoll.makeup/termini
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom import sekcija */}
        <div
          className={
            card +
            " mt-4 border border-dashed border-gray-300 rounded-xl p-6 bg-gray-50"
          }
        >
          {formData.content && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Preview templejta:</h4>
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                <iframe
                  srcDoc={formData.content}
                  className="w-full h-screen min-h-96"
                  title="Custom Template Preview"
                  sandbox="allow-same-origin"
                />
              </div>
              <div className="flex flex-col lg:flex-row gap-x-6">
                <button
                  onClick={() => setCustomHtmlInput(formData.content)}
                  className="cursor-pointer mt-4 px-6 py-3 bg-(--secondary-color) text-white rounded-lg hover:bg-(--secondary-color)/90"
                >
                  Učitaj preview u &#34;Importuj ili kreiraj templejt&#34;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setFormData({
                      ...formData,
                      templateId: "",
                      subject: "",
                      content: "",
                      variables: {},
                    });
                  }}
                  className="cursor-pointer mt-4 px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-lg dark:hover:bg-gray-800 hover:bg-gray-100"
                >
                  Obriši preview templejt
                </button>
              </div>
            </div>
          )}
          <h3 className="text-xl font-semibold mb-4">
            Importuj ili kreiraj templejt
          </h3>

          <textarea
            id="custom-html-template"
            value={customHtmlInput}
            onChange={(e) => setCustomHtmlInput(e.target.value)}
            placeholder="Ovde zalepi čist HTML kod templejta (bez <html>, <body>, <head> tagova)"
            className="w-full h-60 lg:h-48 p-4 border border-gray-300 dark:border-gray-700 rounded-lg font-mono text-sm"
          />
          <label className="flex items-center gap-3 my-4">
            <input
              type="checkbox"
              checked={isVariable}
              onChange={() => {
                setIsVariable(!isVariable);
                if (!isVariable) {
                  toast.success("Templejt označen da ima varijable");
                } else {
                  toast.success("Templejt označen da nema varijable");
                }
              }}
              className="size-5"
            />
            <span className="font-medium">Označi da ima varijable</span>
          </label>
          <div className="flex flex-col lg:flex-row gap-4 mt-4">
            <button
              onClick={handleCustomImport}
              className="cursor-pointer px-6 py-3 bg-(--secondary-color) text-white rounded-lg hover:bg-(--secondary-color)/90"
            >
              Učitaj u preview
            </button>

            {previewHtml && (
              <button
                onClick={handleSaveCustomTemplate}
                disabled={isCreatingTemplate}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer disabled:opacity-10"
              >
                {isCreatingTemplate ? (
                  <LoaderButton />
                ) : (
                  "Sačuvaj kao novi templejt"
                )}
              </button>
            )}
            {previewHtml && (
              <button
                onClick={handleUpdateTemplate}
                disabled={isUpdatingTemplate}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-10"
              >
                {isUpdatingTemplate ? <LoaderButton /> : "Ažuriraj templejt"}
              </button>
            )}
            {customHtmlInput && (
              <button
                type="button"
                onClick={() => {
                  setCustomHtmlInput("");
                  setIsVariable(false);
                }}
                className="cursor-pointer px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-lg dark:hover:bg-gray-800 hover:bg-gray-100"
              >
                Obriši HTML templejta
              </button>
            )}
          </div>
        </div>
      </div>
      <div className={card}>
        <div className="flex flex-col lg:flex-row justify-between items-center mb-8">
          <h2 className="text-2xl! lg:text-4xl! font-bold">
            Kreiranje Kampanje
          </h2>
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`px-6 py-2 lg:py-3 ${
              isFormOpen
                ? `bg-red-500 hover:bg-red-600`
                : `bg-(--secondary-color) hover:bg-(--secondary-color)/90`
            } text-white rounded-lg cursor-pointer w-full lg:w-auto mt-3`}
          >
            {isFormOpen ? "Otkaži" : "+ Nova kampanja"}
          </button>
        </div>

        {/* Forma za kreiranje kampanje */}
        {isFormOpen && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 lg:p-6 mb-8">
            <h3 className="text-2xl font-semibold mb-6">
              Kreiraj novu kampanju
            </h3>
            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div>
                <label className="block text-sm font-medium mb-2">
                  Naziv kampanje
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--secondary-color)"
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-sm font-medium mb-2">
                  Izabrani templejt
                </label>
                {selectedTemplate ? (
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-950 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-semibold">
                        {selectedTemplate.name}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        ({selectedTemplate.slug})
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTemplate(null);
                        setFormData({
                          ...formData,
                          templateId: "",
                          subject: "",
                          content: "",
                          variables: {},
                        });
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Ukloni
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500 px-4 py-2 text-xs italic">
                    Kliknite na &ldquo;Koristi u kampanji&ldquo; kod željenog
                    templejta iz liste iznad
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--secondary-color)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Preview tekst
                </label>
                <input
                  type="text"
                  value={formData.previewText}
                  onChange={(e) =>
                    setFormData({ ...formData, previewText: e.target.value })
                  }
                  placeholder="Tekst koji se vidi pre otvaranja emaila"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--secondary-color)"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Zakazivanje pocetka kampanje
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledFor: e.target.value })
                  }
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-(--secondary-color)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Ostavi prazno za slanje odmah nakon kreiranja
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.sendToAll}
                    onChange={(e) => {
                      setFormData({ ...formData, sendToAll: e.target.checked });
                    }}
                    className="size-5"
                  />
                  <span className="font-medium">
                    Pošalji svim pretplatnicima
                  </span>
                </label>
                {!formData.sendToAll && (
                  <div className={card + " md:col-span-2 mt-6"}>
                    <h4 className="font-semibold mb-4">
                      Ručni odabir primaoca
                    </h4>

                    {/* Pretraga */}
                    <input
                      type="text"
                      placeholder="Pretraži po imenu ili emailu..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-950 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-(--secondary-color)"
                    />

                    {/* Select all */}
                    <label className="flex items-center gap-2 mb-4">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={
                          hasSelection && selected.length === subscribers.length
                        }
                        onChange={() => {
                          toggleAll();
                          updateSelectAllIndeterminate();
                        }}
                        className="size-4"
                      />
                      <span className="text-sm">
                        Izaberi sve na ovoj strani
                      </span>
                    </label>

                    {/* Lista */}
                    <div className="max-h-96 overflow-y-auto px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      {isLoadingUser ? (
                        <p className="p-4 text-center text-gray-500">
                          Učitavanje...
                        </p>
                      ) : subscribers.length === 0 ? (
                        <p className="p-4 text-center text-gray-500">
                          Nema pretplatnika
                        </p>
                      ) : (
                        subscribers.map((sub) => (
                          <label
                            key={sub._id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-950/10 border-b border-gray-200 dark:border-gray-700 last:border-0"
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(sub.email)}
                              onChange={() => toggleSubscriber(sub.email)}
                              className="size-4"
                            />
                            <div>
                              <div className="font-medium">{sub.name}</div>
                              <div className="text-sm text-gray-600">
                                {sub.email}
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>

                    {/* Badge-ovi */}
                    {hasSelection && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selected.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm"
                          >
                            {email}
                            <button
                              onClick={() => toggleSubscriber(email)}
                              className="hover:text-pink-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={clearSelection}
                          className="text-sm text-gray-600 hover:text-gray-700"
                        >
                          Obriši sve
                        </button>
                      </div>
                    )}

                    {/* Paginacija */}
                    {pages > 1 && (
                      <div className="mt-4 flex justify-center gap-2">
                        {Array.from({ length: pages }, (_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setPage(i + 1)}
                            className={`px-3 py-1 rounded ${
                              page === i + 1
                                ? "bg-pink-600 text-white"
                                : "bg-gray-200"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="col-span-1 lg:col-span-2 gap-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.excludeRecentSubscribers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        excludeRecentSubscribers: e.target.checked,
                      })
                    }
                  />
                  <span>Isključi nove pretplatnike (poslednjih 30 dana)</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.excludeInactive}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        excludeInactive: e.target.checked,
                      })
                    }
                  />
                  <span>Isključi neaktivne (nema otvaranja 90+ dana)</span>
                </label>
              </div>

              <div className="md:col-span-2 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="cursor-pointer px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950/30"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="cursor-pointer px-6 py-3 bg-(--secondary-color) text-white rounded-lg hover:bg-(--secondary-color)/90 disabled:opacity-70"
                >
                  {isCreating ? "Kreiram..." : "Kreiraj kampanju"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista kampanja */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-semibold">Sve kampanje</h3>
          </div>
          <div className="divide-y divide-gray-200 px-3">
            {campaigns.length === 0 ? (
              <p className="p-8 text-center text-gray-500">
                Još nema kreiranih kampanja
              </p>
            ) : (
              campaigns.map((c) => (
                <div
                  key={c._id}
                  className="p-4 flex flex-col items-start gap-3"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{c.name}</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      <span>
                        Status: <strong>{c.status.toUpperCase()}</strong>
                      </span>
                      {" • "}
                      <span>Poslato: {c.sentCount}</span>
                      {" • "}
                      <span>Kliknuto: {c.clickCount}</span>
                      {" • "}
                      <span>
                        Otvoreno: {c.openCount} (
                        {Math.round((c.openCount / (c.sentCount || 1)) * 100)}%)
                      </span>
                      {c.scheduledFor && (
                        <>
                          {" • "}
                          <span>
                            Zakazano:{" "}
                            {format(
                              new Date(c.scheduledFor),
                              "dd.MM.yyyy HH:mm",
                            )}
                          </span>
                        </>
                      )}
                      {c.sentAt && (
                        <>
                          {" • "}
                          <span>
                            Poslato:{" "}
                            {format(new Date(c.sentAt), "dd.MM.yyyy HH:mm")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {semanticCampaign && (
                      <AdminSemanticModal
                        isOpen={true}
                        onClose={() => setSemanticCampaign(null)}
                        campaign={semanticCampaign}
                      />
                    )}
                    {c.status === "draft" || c.status === "scheduled" ? (
                      <button
                        onClick={() => setSemanticCampaign(c)}
                        className="cursor-pointer px-3 py-2.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded"
                      >
                        Semantic / Landing
                      </button>
                    ) : null}
                    {c.status === "draft" ||
                    c.status === "scheduled" ||
                    c.status === "paused" ? (
                      <button
                        onClick={() => handleSend(c._id, c.name)}
                        disabled={isSending}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-70 cursor-pointer"
                      >
                        {isSending ? "Pokrećem..." : "Pokreni sada"}
                      </button>
                    ) : null}

                    {c.status === "sending" && (
                      <>
                        <button
                          onClick={() => pauseCampaign(c._id)}
                          disabled={isPausing}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-70 cursor-pointer"
                        >
                          {isPausing ? "Pauziram..." : "Pauziraj"}
                        </button>
                      </>
                    )}

                    {c.status === "paused" && (
                      <>
                        <button
                          onClick={() => resumeCampaign(c._id)}
                          disabled={isResuming}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70"
                        >
                          {isResuming ? "Nastavljam..." : "Nastavi"}
                        </button>
                        <button
                          onClick={() => stopCampaign(c._id)}
                          disabled={isStopping}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-70 cursor-pointer"
                        >
                          Zaustavi
                        </button>
                      </>
                    )}

                    {(c.status === "sending" || c.status === "paused") && (
                      <button
                        onClick={() => stopCampaign(c._id)}
                        disabled={isStopping}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-70 cursor-pointer"
                      >
                        {isStopping ? "Zaustavljam..." : "Zaustavi trajno"}
                      </button>
                    )}

                    {c.status === "draft" || c.status === "scheduled" ? (
                      <button
                        onClick={() => setPreviewCampaign(c)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2 cursor-pointer"
                      >
                        Preview
                      </button>
                    ) : null}

                    {/* Brisanje uvek dozvoljeno (osim možda ako je sending) */}
                    {c.status !== "sending" && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Da li ste sigurni da želite da obrišete kampanju "${c.name}"?`,
                            )
                          ) {
                            deleteCampaign(c._id);
                          }
                        }}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-70 cursor-pointer"
                      >
                        Obriši
                      </button>
                    )}
                    {c.semanticContent?.status && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                        {c.semanticContent.status}
                      </span>
                    )}
                    {/* Status badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusBadgeStyles[c.status]
                      }`}
                    >
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {previewCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-full overflow-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-2xl font-semibold">
                Preview: {previewCampaign.name}
              </h3>
              <button
                onClick={() => setPreviewCampaign(null)}
                className="text-gray-500 hover:text-gray-700 text-3xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <iframe
                srcDoc={previewCampaign.content}
                className="w-full h-screen min-h-96 border-2 border-gray-200 rounded-lg"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
