import { NextRequest, NextResponse } from "next/server";

const API_ENDPOINTS = [
  "https://vgcassistant.com/api/openai/v1/chat/completions",
  "https://api.vgcassistant.com/api/openai/v1/chat/completions",
  "https://api-v2.vgcassistant.com/api/openai/v1/chat/completions",
];

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

export class OpenAIHandler {
  async handle(req: NextRequest) {
    try {
      const body = await req.json();

      // Validate request body
      if (!body.messages || !Array.isArray(body.messages)) {
        throw new Error("Invalid request format: messages array is required");
      }

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

      // Try each endpoint
      let lastError;
      for (const endpoint of API_ENDPOINTS) {
        try {
          const response = await fetchWithRetry(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
          });

          if (response.ok) {
            return requestBody.stream
              ? new Response(response.body, {
                  headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                  },
                })
              : NextResponse.json(await response.json());
          }
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      throw lastError || new Error("All endpoints failed");
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
}

export const runtime = "edge";
