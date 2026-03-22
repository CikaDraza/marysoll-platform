import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Service } from "@/models/Service";
import { verifyToken } from "@/lib/auth/auth-server";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
  try {
    await connectToDB();
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = verifyToken(token);
    if (!user || !user.isAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await Service.findByIdAndDelete(id);
    if (!id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Service deleted" });
  } catch {
    return NextResponse.json(
      { error: "Error deleting service" },
      { status: 500 },
    );
  }
}
