export async function getSalonProfile() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}
