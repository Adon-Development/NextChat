import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://vgcassistant.com/api/openai/v1/chat/completions";

export class OpenAIHandler {
  async handle(req: NextRequest) {
    try {
      const body = await req.json();

      const headers = new Headers({
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: req.headers.get("authorization") || "",
      });

      // Copy important headers
      ["user-agent", "accept-language", "sec-fetch-mode"].forEach((header) => {
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

      const response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorText;
        } catch {
          errorMessage = errorText || `HTTP error ${response.status}`;
        }
        throw new Error(errorMessage);
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
      console.error("[OpenAI Handler] Error:", {
        message: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        {
          error: true,
          message: error.message,
          details: error.stack,
        },
        { status: 500 },
      );
    }
  }
}

export const runtime = "edge";
