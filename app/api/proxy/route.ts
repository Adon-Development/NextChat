import { NextResponse } from "next/server";

export const runtime = "edge";

const API_URL = "https://vgcassistant.com/api/openai/v1/chat/completions";

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Proxy ${requestId}] Request received`);

  try {
    const body = await req.json();

    // Forward the complete body while ensuring required fields
    const requestBody = {
      ...body,
      model: body.model || "gpt-4o-mini",
      temperature: body.temperature ?? 0.5,
      max_tokens: body.max_tokens ?? 4000,
      stream: body.stream ?? true,
      presence_penalty: body.presence_penalty ?? 0,
      frequency_penalty: body.frequency_penalty ?? 0,
      top_p: body.top_p ?? 1,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("authorization") || "",
        Accept: "application/json, text/event-stream",
        Origin: new URL(req.url).origin,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    // If streaming is requested, return the stream directly
    if (requestBody.stream) {
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
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
