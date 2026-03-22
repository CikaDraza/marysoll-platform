"use client";
import { useState, useCallback } from "react";
import Image from "next/image";
import { generateImage } from "@/services/geminiService";

export function Theme3ImageGenerationSection() {
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
    <section className="bg-[#F5EEE8] py-20 lg:py-28 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase mb-3">AI kreator</p>
        <h2 className="text-3xl font-light text-[#3D2B1F] mb-4">Kreiraj svoj izgled</h2>
        <p className="text-[#9E7E6E] text-sm mb-8 max-w-md mx-auto">Opišite željeni makeup, nokte ili stil i naš AI će kreirati viziju za vas.</p>
        <div className="flex gap-3 mb-6">
          <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} disabled={isLoading}
            placeholder="Npr. nežni roze makeup za proleće..."
            className="flex-1 px-5 py-3 rounded-full bg-white border border-[#E0D5CC] text-[#5C4033] text-sm focus:outline-none focus:border-[#C9A990] placeholder:text-[#C0B0A8]" />
          <button onClick={handleGenerate} disabled={isLoading}
            className="px-6 py-3 bg-[#C9A990] text-white text-sm font-medium rounded-full hover:bg-[#B8957A] transition disabled:opacity-50">
            {isLoading ? "..." : "Generiši"}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <div className="bg-white/60 border border-[#EDE5DC] rounded-3xl min-h-48 flex items-center justify-center p-4">
          {generatedImage
            ? <Image src={generatedImage} alt="AI generated" width={400} height={400} className="rounded-2xl max-h-96 object-contain" />
            : <p className="text-[#C0B0A8] text-sm">{isLoading ? "Kreira se vaša vizija..." : "Ovde će se pojaviti generisana slika"}</p>
          }
        </div>
      </div>
    </section>
  );
}
