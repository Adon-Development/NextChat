import { NextRequest, NextResponse } from "next/server";

const VGC_ENDPOINT = "https://vgcassistant.com/bot";

export class OpenAIHandler {
  async handle(req: NextRequest, params: { provider: string; path: string[] }) {
    try {
      const { messages = [] } = await req.json();

      // Filter out summary requests
      if (this.isSummaryRequest(messages)) {
        return this.emptyResponse();
      }

      // Extract user messages
      const userMessages = messages
        .filter((m: any) => m.role === "user")
        .map((m: any) => m.content)
        .join("\n");

      const response = await fetch(VGC_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("authorization") || "",
        },
        body: JSON.stringify({
          query: userMessages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return NextResponse.json({
        choices: [
          {
            message: {
              role: "assistant",
              content: Array.isArray(data.structured)
                ? data.structured.join("\n\n")
                : data.original,
            },
            finish_reason: "stop",
          },
        ],
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: true,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }

  private isSummaryRequest(messages: any[]) {
    if (messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    return (
      lastMsg.role === "user" &&
      (lastMsg.content
        .toLowerCase()
        .includes("generate a four to five word title") ||
        lastMsg.content.toLowerCase().includes("summarize"))
    );
  }

  private emptyResponse() {
    return NextResponse.json({
      choices: [
        {
          message: { role: "assistant", content: "" },
          finish_reason: "stop",
        },
      ],
    });
  }
}

export const runtime = "edge";
