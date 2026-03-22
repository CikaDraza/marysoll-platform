// src/app/api/og/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = url.searchParams.get("title") || "MarySoll Makeup";
  const subtitle =
    url.searchParams.get("subtitle") || "Makeup • Nails • Bor, Serbia";
  const logo = url.searchParams.get("logo") || "";

  // Simple encoded SVG. You can expand fonts / styles later.
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#f5f3ff"/>
        <stop offset="1" stop-color="#efeaff"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g transform="translate(60,60)">
      ${
        logo
          ? `<image href="${logo}" x="0" y="0" width="120" height="120" preserveAspectRatio="xMidYMid slice" />`
          : `<rect x="0" y="0" width="120" height="120" fill="#fff" rx="16" />`
      }
      <text x="160" y="48" font-size="44" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="#111">${escapeXml(
        title
      )}</text>
      <text x="160" y="96" font-size="22" font-family="Arial, Helvetica, sans-serif" fill="#444">${escapeXml(
        subtitle
      )}</text>
      <rect x="0" y="150" width="1080" height="2" fill="#e9e7ff" />
      <text x="0" y="210" font-size="18" font-family="Arial, Helvetica, sans-serif" fill="#666">${escapeXml(
        "Profesionalna šminka • Manikir • Gel lak • Zakazivanje online"
      )}</text>
    </g>
  </svg>
  `;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // 1 hour
    },
  });
}

function escapeXml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
