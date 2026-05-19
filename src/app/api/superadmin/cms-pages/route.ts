// GET  /api/superadmin/cms-pages        — list all cms pages
// POST /api/superadmin/cms-pages        — create new page
// PUT  /api/superadmin/cms-pages        — update existing page (by slug)
// DELETE /api/superadmin/cms-pages?slug — delete page
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { requireSuperAdmin } from "@/lib/auth/auth-server";
import { ProfilPlatforme } from "@/models/ProfilPlatforme";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
}

async function getPlatformDoc() {
  return ProfilPlatforme.findOne({});
}

export async function GET(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectToDB();
  const profile = await getPlatformDoc();
  if (!profile) return NextResponse.json({ error: "Profil nije pronađen" }, { status: 404 });

  const pages = Object.values(profile.cmsPages ?? {});
  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json() as { title?: string; slug?: string; content?: string };
  if (!body.title) return NextResponse.json({ error: "title je obavezan" }, { status: 400 });

  const slug = body.slug || slugify(body.title);

  await connectToDB();
  const profile = await getPlatformDoc();
  if (!profile) return NextResponse.json({ error: "Profil nije pronađen" }, { status: 404 });

  if ((profile.cmsPages ?? {})[slug]) {
    return NextResponse.json({ error: "Stranica sa tim slug-om već postoji" }, { status: 409 });
  }

  const page = { title: body.title, slug, content: body.content ?? "", updatedAt: new Date() };
  await ProfilPlatforme.findByIdAndUpdate(profile._id, {
    $set: { [`cmsPages.${slug}`]: page },
  });

  return NextResponse.json({ ok: true, slug });
}

export async function PUT(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json() as { slug?: string; title?: string; content?: string };
  if (!body.slug) return NextResponse.json({ error: "slug je obavezan" }, { status: 400 });

  await connectToDB();
  const profile = await getPlatformDoc();
  if (!profile) return NextResponse.json({ error: "Profil nije pronađen" }, { status: 404 });

  const existing = (profile.cmsPages ?? {})[body.slug];
  if (!existing) return NextResponse.json({ error: "Stranica nije pronađena" }, { status: 404 });

  const page = {
    ...existing,
    title: body.title ?? existing.title,
    content: body.content ?? existing.content,
    updatedAt: new Date(),
  };

  await ProfilPlatforme.findByIdAndUpdate(profile._id, {
    $set: { [`cmsPages.${body.slug}`]: page },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = requireSuperAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug je obavezan" }, { status: 400 });

  await connectToDB();
  const profile = await getPlatformDoc();
  if (!profile) return NextResponse.json({ error: "Profil nije pronađen" }, { status: 404 });

  await ProfilPlatforme.findByIdAndUpdate(profile._id, {
    $unset: { [`cmsPages.${slug}`]: "" },
  });

  return NextResponse.json({ ok: true });
}
