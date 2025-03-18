import { NextResponse } from "next/server";

export const runtime = "edge";

const API_URL = "https://vgcassistant.com/api/openai/v1/chat/completions";
const IS_PUBLIC_ACCESS = true; // Allow public access by default

const ERROR_MESSAGES: Record<string, string> = {
  "1000": "Authentication error - Please check your API key and try again",
  "1019": "Cloudflare security check failed - Please refresh the page",
  "1020": "Access denied by security rules",
  "1015": "Rate limit exceeded",
  // Add more error codes as needed
};

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Proxy ${requestId}] Request received`);

  try {
    const body = await req.json();

    // Validate request body
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new Error("Invalid request format: messages array is required");
    }

    // Get auth header but don't require it
    const authHeader = req.headers.get("authorization");

    // Only check auth if not in public access mode
    if (!IS_PUBLIC_ACCESS && !authHeader) {
      throw new Error("Authentication required");
    }

    const headers = new Headers({
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Origin: new URL(req.url).origin,
      Cookie: req.headers.get("cookie") || "",
    });

    // Only add auth header if present
    if (authHeader) {
      headers.set("Authorization", authHeader);
    }

    [
      "user-agent",
      "accept-language",
      "sec-fetch-mode",
      "sec-fetch-site",
      "sec-ch-ua",
      "sec-ch-ua-platform",
      "referer",
    ].forEach((header) => {
      const value = req.headers.get(header);
      if (value) headers.set(header, value);
    });

    console.log(
      `[Proxy ${requestId}] Sending request with headers:`,
      Object.fromEntries(headers.entries()),
    );

    const response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        const errorCode = errorJson.message?.match(/error code: (\d+)/)?.[1];
        errorMessage = errorCode
          ? `${
              ERROR_MESSAGES[errorCode] || "Unknown error"
            } (Code: ${errorCode})`
          : errorJson.message || errorJson.error || errorText;
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
    const statusCode = error.message.includes("Authentication") ? 401 : 500;
    return NextResponse.json(
      {
        error: true,
        message: error.message,
        details: error.stack,
      },
      { status: statusCode },
    );
  }
}

export const GET = POST;
