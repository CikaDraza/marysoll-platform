// src/services/generateImageWidget.ts

export const generateImageWidget = async (prompt: string): Promise<string> => {
  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Server error");
  }

  const data = await res.json();
  return data.image;
};
