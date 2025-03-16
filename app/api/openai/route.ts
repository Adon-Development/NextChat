import { NextRequest, NextResponse } from "next/server";

export class OpenAIHandler {
  async handle(req: NextRequest, params: { provider: string; path: string[] }) {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[OpenAI ${requestId}] Processing request`);

    const authHeader = req.headers.get("authorization");
    console.log(
      `[OpenAI ${requestId}] Auth header:`,
      authHeader?.substring(0, 20) + "...",
    );

    try {
      const clone = req.clone();
      const body = await clone.text();
      const parsedBody = JSON.parse(body);

      console.log(`[OpenAI ${requestId}] Request payload:`, {
        messages: parsedBody.messages?.length,
        stream: parsedBody.stream,
        model: parsedBody.model,
      });

      // Block summary requests by checking last message
      const messages = parsedBody.messages || [];
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (
          lastMsg.role === "user" &&
          (lastMsg.content
            .toLowerCase()
            .includes("generate a four to five word title") ||
            lastMsg.content.toLowerCase().includes("summarize"))
        ) {
          console.log(`[OpenAI ${requestId}] Blocked summary request`);
          return new NextResponse(
            JSON.stringify({
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: "",
                  },
                  finish_reason: "stop",
                },
              ],
            }),
            { status: 200 },
          );
        }
      }

      // Keep regular chat messages only
      const userMessages = messages
        .filter(
          (m: any) =>
            m.role === "user" &&
            !m.content
              .toLowerCase()
              .includes("generate a four to five word title") &&
            !m.content.toLowerCase().includes("summarize"),
        )
        .map((m: any) => m.content)
        .join("\n");

      // Get base URL from request header or originating host
      const baseUrl = this.getBaseUrl(req);
      const apiEndpoint = this.buildApiEndpoint(baseUrl);

      console.log(`[OpenAI ${requestId}] Using API endpoint:`, apiEndpoint);

      // Forward request to VGC Assistant
      const fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader || "",
          "X-Real-Host": req.headers.get("host") || "",
          "X-Forwarded-Host": req.headers.get("x-forwarded-host") || "",
          "X-Original-URL": req.url,
        },
        body: JSON.stringify({
          query: userMessages || "", // Send all user messages
          stream: parsedBody.stream, // Preserve streaming mode
        }),
      };

      console.log(`[OpenAI ${requestId}] Fetch options:`, {
        url: apiEndpoint,
        headers: fetchOptions.headers,
        bodyLength: fetchOptions.body.length,
      });

      // Make the API request with retry logic
      const response = await this.fetchWithRetry(
        apiEndpoint,
        fetchOptions,
        requestId,
      );

      console.log(`[OpenAI ${requestId}] Response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      if (!data) {
        throw new Error("Empty response from VGC Assistant");
      }

      try {
        const parsedData = JSON.parse(data);
        return new NextResponse(
          JSON.stringify({
            choices: [
              {
                message: {
                  role: "assistant",
                  content: Array.isArray(parsedData.structured)
                    ? parsedData.structured.join("\n\n")
                    : parsedData.original,
                },
                finish_reason: "stop",
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } catch (e) {
        // If response isn't JSON, return as plain text
        return new NextResponse(data, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }
    } catch (error) {
      console.error(`[OpenAI ${requestId}] Error:`, error);
      return NextResponse.json(
        {
          error: true,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  private getBaseUrl(req: NextRequest): string {
    // First check for explicit base URL header
    const baseUrlHeader = req.headers.get("x-base-url");
    if (baseUrlHeader) return baseUrlHeader;

    // Then check forwarded host
    const forwardedHost = req.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      return `${protocol}://${forwardedHost}`;
    }

    // Fallback to request host
    const host = req.headers.get("host");
    return host ? `https://${host}` : "https://vgcassistant.com";
  }

  private buildApiEndpoint(baseUrl: string): string {
    try {
      baseUrl = baseUrl.replace(/\/+$/, "");
      const url = new URL("/bot", baseUrl);
      return url.toString();
    } catch (e) {
      throw new Error(`Invalid base URL: ${baseUrl}`);
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    requestId: string,
    retries = 3,
  ): Promise<Response> {
    const timeout = 30000; // 30 second timeout
    let controller = new AbortController();

    // Add timeout signal to options
    options.signal = controller.signal;

    for (let i = 0; i < retries; i++) {
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        console.log(
          `[OpenAI ${requestId}] Attempt ${
            i + 1
          }/${retries} to fetch from ${url}`,
        );

        // Validate endpoint is reachable
        try {
          await fetch(new URL(url).origin, {
            method: "HEAD",
            signal: controller.signal,
          });
        } catch (e) {
          console.error(`[OpenAI ${requestId}] Endpoint validation failed:`, e);
          throw new Error(`Endpoint ${url} is not reachable`);
        }

        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Connection: "keep-alive",
            "Keep-Alive": "timeout=60",
          },
        });

        clearTimeout(timeoutId);

        // Check common error status codes
        if (response.status === 404) {
          throw new Error("Endpoint not found");
        } else if (response.status === 403) {
          throw new Error("Access forbidden");
        } else if (response.status === 401) {
          throw new Error("Unauthorized");
        } else if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);

        const isLastAttempt = i === retries - 1;
        const isTimeout = error.name === "AbortError";

        console.error(
          `[OpenAI ${requestId}] Fetch error (attempt ${i + 1}/${retries}):`,
          isTimeout ? "Request timed out" : error.message,
        );

        if (isLastAttempt) {
          throw new Error(
            `Failed to connect to VGC Assistant after ${retries} attempts. ` +
              `Last error: ${isTimeout ? "Request timed out" : error.message}`,
          );
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          1000 * Math.pow(2, i) + Math.random() * 1000,
          10000,
        );
        console.log(
          `[OpenAI ${requestId}] Retrying in ${Math.round(delay)}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));

        // Create new controller for next attempt
        controller = new AbortController();
        options.signal = controller.signal;
      }
    }

    throw new Error("Retry loop completed without return");
  }
}

export const runtime = "edge";
