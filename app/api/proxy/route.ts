import { NextResponse } from "next/server";

export const runtime = "edge";

const API_URL = "https://vgcassistant.com/api/openai/v1/chat/completions";

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Proxy ${requestId}] Request received`);

  try {
    const body = await req.json();

    // Forward all original headers
    const headers = new Headers({
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: req.headers.get("authorization") || "",
      Origin: new URL(req.url).origin,
    });

    // Copy additional headers from original request
    ["user-agent", "accept-language", "sec-fetch-mode"].forEach((header) => {
      const value = req.headers.get(header);
      if (value) headers.set(header, value);
    });

    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    // Get error details if available
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText || `HTTP error ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    // Handle streaming response
    if (body.stream) {
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
      {
        error: true,
        message: error.message,
        details: error.stack,
      },
      { status: 500 },
    );
  }
}

export const GET = POST;
