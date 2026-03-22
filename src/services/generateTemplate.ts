export const generateNewsletterTemplate = async (
  prompt: string
): Promise<string> => {
  const res = await fetch("/api/generate-email-template", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Server error");
  }

  const data = await res.json();
  return data.htmlContent;
};
