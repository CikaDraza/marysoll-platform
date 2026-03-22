import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Plan } from "@/models/Plan";
import { requireSuperAdmin } from "@/lib/auth/auth-server";

export async function GET() {
  await connectToDB();
  const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const authResult = requireSuperAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  await connectToDB();
  const data = await request.json();
  const plan = new Plan(data);
  await plan.save();
  return NextResponse.json(plan, { status: 201 });
}
