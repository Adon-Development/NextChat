import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Proxy ${requestId}] Request received`);

  try {
    const body = await req.text();

    console.log(`[Proxy ${requestId}] Request details:`, {
      url: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers),
    });

    const fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      mode: "no-cors" as RequestMode,
    };

    console.log(`[Proxy ${requestId}] Fetching with options:`, fetchOptions);

    const response = await fetch("https://vgcassistant.com/bot", fetchOptions);

    console.log(`[Proxy ${requestId}] VGC Response:`, {
      status: response.status,
      statusText: response.statusText,
    });

    const data = await response.text();
    return NextResponse.json(JSON.parse(data), {
      status: response.status,
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
