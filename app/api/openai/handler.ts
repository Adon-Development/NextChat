import { NextRequest, NextResponse } from "next/server";

const API_ENDPOINT = "https://vgcassistant.com/bot";
const IS_PUBLIC_ACCESS = true;

const ERROR_MESSAGES: Record<string, string> = {
  "1000": "Authentication error - Please check your API key and try again",
  "1019": "Cloudflare security check failed - Please refresh the page",
  "1020": "Access denied by security rules",
  "1015": "Rate limit exceeded",
};

export async function handleRequest(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    const lastUserMessage = messages
      .filter((m: any) => m.role === "user")
      .pop();
    const query = lastUserMessage?.content || "";

    const headers = new Headers({
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Origin: req.headers.get("origin") || "",
      Cookie: req.headers.get("cookie") || "",
    });

    // Copy important headers from request
    ["user-agent", "authorization"].forEach((header) => {
      const value = req.headers.get(header);
      if (value) headers.set(header, value);
    });

    const transformedBody = {
      query,
      stream: body.stream ?? true,
      temperature: body.temperature ?? 0.5,
    };

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(transformedBody),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    if (transformedBody.stream) {
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          try {
            const data = JSON.parse(text);
            const content = data.structured?.[0] || data.original || "";
            if (content) {
              controller.enqueue(
                `data: ${JSON.stringify({
                  choices: [{ delta: { content }, finish_reason: null }],
                })}\n\n`,
              );
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
    return NextResponse.json(
      { error: true, message: error.message },
      { status: error.message.includes("404") ? 404 : 500 },
    );
  }
}
