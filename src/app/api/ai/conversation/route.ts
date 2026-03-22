import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/helpers/rate-limit";
import { getRequestIP } from "@/helpers/request-ip";
import { askChatAgent } from "@/lib/ai/chat-agent";
import { resolveTenant } from "@/lib/auth/auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getRequestIP();
  const limit = rateLimit(`chat:${ip}`, { windowMs: 60_000, max: 10 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const tenant = await resolveTenant(request);

    // Check tenant AI settings
    if (tenant && !tenant.aiSettings.chatEnabled) {
      return NextResponse.json(
        { error: "AI chat nije aktivan za ovaj salon." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { message, isAuthenticated, history, userName } = body as {
      message: string;
      isAuthenticated: boolean;
      history: { role: "user" | "assistant"; content: string }[];
      userName: string;
    };

    const stream = await askChatAgent({
      userInput: message,
      isAuthenticated,
      history: history ?? [],
      userName,
      tenantId: tenant?._id?.toString() ?? null,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI conversation error:", error);
    return NextResponse.json({ error: "Greška AI servisa" }, { status: 500 });
  }
}
