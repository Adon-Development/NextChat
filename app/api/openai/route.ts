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

      // Get base URL from request header
      const baseUrl =
        req.headers.get("x-base-url") || "https://vgcassistant.com";
      const apiEndpoint = `${baseUrl}/bot`;

      console.log(`[OpenAI ${requestId}] Using API endpoint:`, apiEndpoint);

      // Forward request to VGC Assistant
      const fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader || "",
          // Add referrer and origin headers
          Referer: baseUrl,
          Origin: baseUrl,
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

      const response = await fetch(apiEndpoint, fetchOptions);

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
}

export const runtime = "edge";
