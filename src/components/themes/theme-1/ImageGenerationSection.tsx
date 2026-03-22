"use client";
import { useState, useCallback } from "react";
import Image from "next/image";
import { generateImage } from "@/services/geminiService";

export function Theme1ImageGenerationSection() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) { setError("Unesite opis izgleda."); return; }
    setIsLoading(true); setError(null); setGeneratedImage(null);
    try { setGeneratedImage(await generateImage(prompt)); }
    catch { setError("Greška. Pokušajte ponovo."); }
    finally { setIsLoading(false); }
  }, [prompt]);

  return (
    <section className="py-16 lg:py-24 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-(--primary-color) mb-4">Kreiraj svoj izgled</h2>
        <p className="text-gray-500 text-sm mb-8">Opišite željeni makeup, nokte ili stil i naš AI će kreirati viziju za vas.</p>
        <div className="flex gap-3 mb-6">
          <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} disabled={isLoading}
            placeholder="Npr. dramatičan večernji makeup sa zlatnim sjajem"
            className="flex-1 px-5 py-3 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary-color)/40" />
          <button onClick={handleGenerate} disabled={isLoading}
            className="px-6 py-3 bg-(--primary-color) text-white text-sm font-semibold rounded-full hover:bg-(--secondary-color) transition disabled:opacity-50">
            {isLoading ? "..." : "Generiši"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="bg-(--primary-color)/10 rounded-2xl min-h-48 flex items-center justify-center p-4">
          {generatedImage ? (
            <Image src={generatedImage} alt="AI generated" width={400} height={400} className="rounded-xl max-h-96 object-contain" />
          ) : (
            <p className="text-(--primary-color)/60 text-sm">{isLoading ? "AI kreira vašu viziju..." : "Ovde će se pojaviti generisana slika."}</p>
          )}
        </div>
      </div>
    </section>
  );
}
