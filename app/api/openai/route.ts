import { NextRequest, NextResponse } from "next/server";

const API_ENDPOINT = "https://vgcassistant.com/bot";
const IS_PUBLIC_ACCESS = true; // Allow public access by default

const ERROR_MESSAGES: Record<string, string> = {
  "1000": "Authentication error - Please check your API key and try again",
  "1019": "Cloudflare security check failed - Please refresh the page",
  "1020": "Access denied by security rules",
  "1015": "Rate limit exceeded",
  // Add more error codes as needed
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
    }
  }
  throw new Error("All retries failed");
}

export async function POST(req: NextRequest) {
  try {
    console.log("[OpenAI Handler] Processing request:", {
      url: req.url,
      method: req.method,
    });

    const body = await req.json();

    // Extract query from messages
    const messages = body.messages || [];
    const lastUserMessage = messages
      .filter((m: any) => m.role === "user")
      .pop();
    const query = lastUserMessage?.content || "";

    const authHeader = req.headers.get("authorization");

    // Only check auth if not in public access mode
    if (!IS_PUBLIC_ACCESS && !authHeader) {
      throw new Error("Authentication required");
    }

    const headers = new Headers({
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Cookie: req.headers.get("cookie") || "",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124",
      "Sec-CH-UA": '"Chromium";v="91"',
      "Sec-CH-UA-Mobile": "?0",
      "Sec-Fetch-Site": "same-origin",
      "Cache-Control": "no-cache",
    });

    // Only add auth header if present
    if (authHeader) {
      headers.set("Authorization", authHeader);
    }

    // Copy all important headers
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

    // Transform request to match /bot endpoint format
    const requestBody = {
      query,
      stream: body.stream ?? true,
      temperature: body.temperature ?? 0.5,
    };

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    if (requestBody.stream) {
      // Transform bot response into OpenAI SSE format
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          try {
            const data = JSON.parse(text);
            const content = data.structured?.[0] || data.original || "";
            if (content) {
              const message = {
                choices: [
                  {
                    delta: { content },
                    finish_reason: null,
                  },
                ],
              };
              controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
            }
          } catch (e) {
            console.error("Failed to parse chunk:", text);
          }
        },
        flush(controller) {
          controller.enqueue("data: [DONE]\n\n");
        },
      });

      return new Response(response.body?.pipeThrough(transformStream), {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await response.json();
    if (!data.structured?.[0] && !data.original) {
      throw new Error("empty response from server");
    }

    // Transform bot response into OpenAI format
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
export const runtime = "edge";
