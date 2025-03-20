import { NextResponse } from "next/server";

export const runtime = "edge";

const API_ENDPOINT = "https://vgcassistant.com/bot";
const IS_PUBLIC_ACCESS = true;

const ERROR_MESSAGES: Record<string, string> = {
  "1000": "Authentication error - Please check your API key and try again",
  "1019": "Cloudflare security check failed - Please refresh the page",
  "1020": "Access denied by security rules",
  "1015": "Rate limit exceeded",
  // Add more error codes as needed
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2) {
  const timeout = 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options.headers,
        "CF-Access-Client": "browser",
        "CF-IPCountry": "US",
        "CF-RAY": Date.now().toString(36),
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  }
}

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Proxy ${requestId}] Request received`);

  try {
    const body = await req.json();

    // Extract the query from messages
    const messages = body.messages || [];
    const lastUserMessage = messages
      .filter((m: any) => m.role === "user")
      .pop();
    const query = lastUserMessage?.content || "";

    const headers = new Headers({
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Origin: new URL(req.url).origin,
      Cookie: req.headers.get("cookie") || "",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124",
      "Sec-CH-UA": '"Chromium";v="91"',
      "Sec-CH-UA-Mobile": "?0",
      "Sec-Fetch-Site": "same-origin",
      "Cache-Control": "no-cache",
    });

    // Only add auth header if present
    const authHeader = req.headers.get("authorization");
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

    // Transform request body to match /bot endpoint format
    const transformedBody = {
      query,
      stream: body.stream,
      temperature: body.temperature,
    };

    const response = await fetchWithRetry(API_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(transformedBody),
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

    if (body.stream) {
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
