import { NextResponse } from "next/server";
export const runtime = "edge";
export async function POST(req: Request) {
  try {
    // Read the incoming request body (as text, since it's JSON)
    const body = await req.text();
    console.log(
      "[Proxy Route] Forwarding request to Cloudflare Worker with payload:",
      body,
    );

    // Forward the request to your Cloudflare Worker endpoint
    const response = await fetch("https://vgcassistant.com/bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    // Read the response from the Worker
    const data = await response.text();
    console.log("[Proxy Route] Received response status:", response.status);

    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Proxy Route] Error forwarding request:", error);
    return new NextResponse(
      JSON.stringify({ error: true, message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export const GET = POST;
