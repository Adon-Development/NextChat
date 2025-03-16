import { NextRequest, NextResponse } from "next/server";

const VGC_ENDPOINT = "https://vgcassistant.com/bot";

export class OpenAIHandler {
  async handle(req: NextRequest) {
    try {
      const { messages = [] } = await req.json();
      const userText =
        messages.filter((m: any) => m.role === "user").pop()?.content || "";

      const response = await fetch(VGC_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("authorization") || "",
        },
        body: JSON.stringify({ query: userText }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
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
    } catch (error) {
      return NextResponse.json(
        { error: true, message: String(error) },
        { status: 500 },
      );
    }
  }
}

export const runtime = "edge";
