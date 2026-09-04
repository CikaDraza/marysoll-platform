"use client";
import { useState, useCallback } from "react";
import Image from "next/image";
import { generateImageWidget } from "@/services/generateImageWidget";

export function Theme2ImageGenerationSection() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Unesite opis.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      setGeneratedImage(await generateImageWidget(prompt));
    } catch {
      setError("Greška. Pokušajte ponovo.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);

  return (
    <section className="bg-gray-900 py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-12 h-0.5 bg-yellow-500 mx-auto mb-4" />
        <h2 className="text-3xl font-black text-white mb-4">
          AI Kreator izgleda
        </h2>
        <p className="text-gray-600 text-sm mb-8 max-w-md mx-auto">
          Opišite željeni makeup ili stil i naš AI će kreirati viziju za vas.
        </p>
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="Npr. dramatičan večernji makeup sa zlatnim sjajem"
            className="flex-1 px-5 py-3 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-yellow-500 placeholder:text-gray-600 transition"
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-6 py-3 bg-yellow-500 text-gray-950 text-sm font-black rounded hover:bg-yellow-400 transition disabled:opacity-50"
          >
            {isLoading ? "..." : "Generiši"}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl min-h-48 flex items-center justify-center p-4">
          {generatedImage ? (
            <Image
              src={generatedImage}
              alt="AI generated"
              width={400}
              height={400}
              className="rounded-xl max-h-96 w-auto object-contain"
            />
          ) : (
            <p className="text-gray-600 text-sm">
              {isLoading
                ? "Kreira se..."
                : "Ovde će se pojaviti generisana slika."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
