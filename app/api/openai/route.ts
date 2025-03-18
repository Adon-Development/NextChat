import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://vgcassistant.com/api/openai/v1/chat/completions";

export class OpenAIHandler {
  async handle(req: NextRequest) {
    try {
      const body = await req.json();

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

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("authorization") || "",
          Accept: "application/json, text/event-stream",
          Origin: req.headers.get("origin") || "",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      if (requestBody.stream) {
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
      console.error("Error handling request:", error);
      return NextResponse.json(
        { error: true, message: String(error) },
        { status: 500 },
      );
    }
  }
}

export const runtime = "edge";
