// components/admin/AINewsletterTemplateGenerator.tsx
"use client";

import { generateNewsletterTemplate } from "@/services/generateTemplate";
import { useState } from "react";
import toast from "react-hot-toast";

interface Props {
  onTemplateGenerated: (html: string) => void;
}

export default function AINewsletterTemplateGenerator({
  onTemplateGenerated,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Unesite opis templejta");
      return;
    }

    setIsGenerating(true);
    try {
      const html = await generateNewsletterTemplate(prompt);
      setGeneratedHtml(html);
      toast.success("Templejt uspešno generisan!");
    } catch (error: unknown) {
      toast.error(
        (error instanceof Error && error.message) || "Greška pri generisanju",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseTemplate = () => {
    onTemplateGenerated(generatedHtml);
    setIsOpen(false);
    setPrompt("");
    setGeneratedHtml("");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-(--secondary-color) text-white rounded-lg hover:bg-(--secondary-color)/90 cursor-pointer transition-colors"
      >
        ✨ AI Generiši templejt
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4">
              AI Generisanje Email Templejta
            </h3>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-3 bg-(--secondary-color) text-white rounded-lg hover:bg-(--secondary-color)/90 cursor-pointer disabled:opacity-70"
              >
                {isGenerating ? "Generišem..." : "Generiši HTML"}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setPrompt("");
                  setGeneratedHtml("");
                }}
                className="cursor-pointer px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Otkaži
              </button>
            </div>

            {generatedHtml && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Preview:</h4>
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={generatedHtml}
                    className="w-full h-96"
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>

                <button
                  onClick={handleUseTemplate}
                  className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Koristi ovaj templejt u kampanji
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
