"use client";

import { generateImageWidget } from "@/services/generateImageWidget";
import Image from "next/image";
import { useCallback, useState } from "react";

export function Theme1ImageGenerationSection() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Molimo unesite opis izgleda koji želite da generišete.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const imageData = await generateImageWidget(prompt);
      setGeneratedImage(imageData);
    } catch (e) {
      setError(
        "Došlo je do greške prilikom generisanja slike. Molimo pokušajte ponovo.",
      );
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);

  return (
    <section id="ai-generator" className="py-4 md:py-32 mx-auto">
      <div className="container mx-auto px-6 text-center text-black">
        <h2 className="text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl mb-6">
          Kreiraj svoj izgled
        </h2>
        <p className="max-w-2xl mx-auto text-sm text-black/80 mb-16">
          Isprobajte naš AI generator! Opišite kakav makeup, nokte ili stil
          želite, a naša veštačka inteligencija će stvoriti jedinstvenu viziju
          za vas.
        </p>
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Npr. 'dramatičan večernji makeup sa zlatnim sjajem'"
              className="w-full px-6 py-3 rounded-full text-gray-800 ring-1 ring-gray-200 bg-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-(--secondary-color)/70 transition-all"
              disabled={isLoading}
            />
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-(--secondary-color) text-white font-bold py-3 px-8 rounded-full hover:bg-white hover:text-(--secondary-color) cursor-pointer transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generisanje...
                </>
              ) : (
                "Generiši"
              )}
            </button>
          </div>
          {error && <p className="text-red-400 mb-4">{error}</p>}
          <div className="border border-gray-200 rounded-2xl min-h-75 md:md:min-h-100 flex items-center justify-center p-4">
            {generatedImage ? (
              <div className="flex flex-col items-center">
                <Image
                  width={400}
                  height={400}
                  src={generatedImage}
                  alt="Generated look"
                  className="rounded-lg max-h-100 shadow-2xl"
                />
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = generatedImage;
                    link.download = `marysoll-ai-look-${Date.now()}.jpg`;
                    link.click();
                  }}
                  className="mt-4 bg-white text-brand-secondary font-semibold py-2 px-6 rounded-full shadow hover:bg-(--secondary-color) hover:text-white transition-all duration-300"
                >
                  Sačuvaj sliku
                </button>
              </div>
            ) : (
              <p className="text-gray-700">
                {isLoading
                  ? "AI kreira vašu viziju..."
                  : "Ovde će se pojaviti vaša generisana slika."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
