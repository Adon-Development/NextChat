import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Proxy ${requestId}] Request received`);

  try {
    const { messages = [] } = await req.json();
    const userText =
      messages.filter((m: any) => m.role === "user").pop()?.content || "";

    console.log(`[Proxy ${requestId}] Request details:`, {
      url: req.url,
      method: req.method,
      userText,
    });

    const response = await fetch("https://vgcassistant.com/bot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("authorization") || "",
      },
      body: JSON.stringify({ query: userText }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: data.structured?.[0] || data.original || "",
          },
          finish_reason: "stop",
        },
      ],
    });
  } catch (error: any) {
    console.error(`[Proxy ${requestId}] Error:`, {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 },
    );
  }
}

export const GET = POST;
