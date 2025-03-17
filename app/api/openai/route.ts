import { NextRequest, NextResponse } from "next/server";

const API_URL = "https://vgcassistant.com/bot";

export class OpenAIHandler {
  async handle(req: NextRequest) {
    try {
      // Read the incoming request body (as text, since it's1 JSON)
      const body = await req.text();
      let parsedBody;
      try {
        parsedBody = body ? JSON.parse(body) : {};
      } catch (error) {
        console.error("Error parsing request body:", error);
        return NextResponse.json(
          { error: true, message: "Invalid JSON input" },
          { status: 400 },
        );
      }

      // Log the entire request payload
      console.log("Route: /api/openai, Request payload:", parsedBody);

      // Extract user messages and filter out duplicates
      const userMessages = parsedBody.messages?.filter(
        (m: any) => m.role === "user",
      );
      const uniqueUserMessages = Array.from(
        new Set(userMessages.map((m: any) => m.content)),
      ).map((content) => userMessages.find((m: any) => m.content === content));

      // Filter out the specific user input
      const filteredUserMessages = uniqueUserMessages.filter(
        (m) =>
          m?.content !==
          "Please generate a four to five word title summarizing our conversation without any lead-in, punctuation, quotation marks, periods, symbols, bold text, or additional text. Remove enclosing quotation marks.",
      );

      const userText = filteredUserMessages.pop()?.content || "";

      // Log the route name and the user input before making the request
      console.log("Route: /api/openai, User input:", userText);

      // Forward the request to your Cloudflare Worker endpoint
      const requestBody = JSON.stringify({
        query: userText, // Just send the user's text
      });
      console.log("Request body to worker:", requestBody);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("authorization") || "",
        },
        body: requestBody,
      });

      // Read the response from the Worker
      let data;
      try {
        const text = await response.text();
        console.log("Worker response text:", text);
        data = text ? JSON.parse(text) : {};
      } catch (error) {
        console.error("Error parsing response body:", error);
        return NextResponse.json(
          { error: true, message: "Invalid JSON response from worker" },
          { status: 500 },
        );
      }

      // Check if the response contains an error
      if (data.error) {
        console.error("Worker response error:", data.message);
        return NextResponse.json(
          { error: true, message: data.message },
          { status: 500 },
        );
      }

      // Log the processed response data
      console.log("Processed response data:", data);

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
      console.error("Error handling request:", error);
      return NextResponse.json(
        { error: true, message: String(error) },
        { status: 500 },
      );
    }
  }
}

export const runtime = "edge";
