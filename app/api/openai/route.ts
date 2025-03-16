import { NextRequest, NextResponse } from "next/server";

const VGC_ENDPOINTS = [
  "https://api.vgcassistant.com/bot", // Primary endpoint
  "https://vgcassistant.com/bot", // Fallback 1
  "https://backup.vgcassistant.com/bot", // Fallback 2
];

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
    const timeout = 60000; // Increase timeout to 60s
    let lastError: Error | null = null;

    // Add required Cloudflare and DNS resolution headers
    const baseHeaders = {
      ...options.headers,
      Accept: "application/json",
      "CF-Access-Client-Id": "", // Add if you have Cloudflare Access
      "CF-Access-Client-Secret": "", // Add if you have Cloudflare Access
      "CF-IPCountry": "US", // Help with geo-routing
      "CF-Connecting-IP": "", // Will be set by Cloudflare
      "CDN-Loop": "cloudflare",
      "X-Real-IP": "", // Will be set by Cloudflare
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, CF-Access-Client-Id, CF-Access-Client-Secret",
    };

    // Try each endpoint with DNS resolution handling
    for (const endpoint of VGC_ENDPOINTS) {
      let controller = new AbortController();

      for (let i = 0; i < retries; i++) {
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          console.log(
            `[OpenAI ${requestId}] Attempting ${endpoint}, try ${
              i + 1
            }/${retries}`,
          );

          const response = await fetch(endpoint, {
            ...options,
            headers: {
              ...baseHeaders,
              Connection: "keep-alive",
              "Keep-Alive": "timeout=60",
              // Add DNS resolution hint headers
              "Accept-Encoding": "gzip",
              Host: new URL(endpoint).hostname,
            },
            signal: controller.signal,
            // Add fetch options for better DNS handling
            credentials: "omit", // Don't send credentials
            mode: "cors", // Enable CORS
            keepalive: true, // Keep connection alive
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            return response;
          }

          // Handle Cloudflare specific errors
          if (
            response.status === 1016 ||
            response.status === 520 ||
            response.status === 523
          ) {
            console.log(
              `[OpenAI ${requestId}] Cloudflare DNS error ${response.status}, retrying...`,
            );

            // Add delay between retries with jitter for Cloudflare errors
            const delay = Math.min(
              2000 * Math.pow(2, i) + Math.random() * 1000,
              15000,
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          // Try parsing error response
          let errorText = await response.text();
          let errorJson;
          try {
            errorJson = JSON.parse(errorText);
          } catch (e) {
            // If not JSON, use text as is
          }

          lastError = new Error(
            errorJson?.error?.message ||
              errorJson?.message ||
              errorText ||
              `HTTP error ${response.status}`,
          );

          throw lastError;
        } catch (error) {
          clearTimeout(timeoutId);
          lastError = error as Error;

          const isTimeout = error.name === "AbortError";
          const isLastAttempt = i === retries - 1;
          const isLastEndpoint =
            endpoint === VGC_ENDPOINTS[VGC_ENDPOINTS.length - 1];

          // Special handling for DNS and Cloudflare errors
          if (
            error.message?.includes("1016") ||
            error.message?.includes("DNS")
          ) {
            console.warn(
              `[OpenAI ${requestId}] DNS resolution failed for ${endpoint}, trying next endpoint...`,
            );
            break; // Try next endpoint immediately for DNS errors
          }

          if (isLastAttempt && isLastEndpoint) {
            throw new Error(
              `Failed to connect to VGC Assistant after all attempts. Last error: ${lastError?.message}`,
            );
          }

          const delay = Math.min(
            2000 * Math.pow(2, i) + Math.random() * 1000,
            15000,
          );
          await new Promise((r) => setTimeout(r, delay));

          controller = new AbortController();
        }
      }
    }

    throw (
      lastError || new Error("Failed to connect to any VGC Assistant endpoint")
    );
  }
}

export const runtime = "edge";
