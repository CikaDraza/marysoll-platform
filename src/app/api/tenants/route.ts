import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

export async function GET(request: NextRequest) {
  const authResult = requireSuperAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  await connectToDB();
  const tenants = await Tenant.find().populate("ownerId", "name email").lean();
  return NextResponse.json(tenants);
}
