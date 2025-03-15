import { NextApiRequest, NextApiResponse } from "next";
import { OpenAIListModelResponse } from "@/app/client/platforms/openai";
import { getServerSideConfig } from "@/app/config/server";
import { ModelProvider, OpenaiPath } from "@/app/constant";
import { auth } from "./auth";

const ALLOWED_PATH = new Set(Object.values(OpenaiPath));

function getModels(remoteModelRes: OpenAIListModelResponse) {
  const config = getServerSideConfig();

  if (config.disableGPT4) {
    remoteModelRes.data = remoteModelRes.data.filter(
      (m) =>
        !(
          m.id.startsWith("gpt-4") ||
          m.id.startsWith("chatgpt-4o") ||
          m.id.startsWith("o1") ||
          m.id.startsWith("o3")
        ) || m.id.startsWith("gpt-4o-mini"),
    );
  }

  return remoteModelRes;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  console.log("[OpenAI Route] params ", req.query);

  if (req.method === "OPTIONS") {
    res.status(200).json({ body: "OK" });
    return;
  }

  const subpath = Array.isArray(req.query.path)
    ? req.query.path.join("/")
    : req.query.path;

  if (!ALLOWED_PATH.has(subpath)) {
    console.log("[OpenAI Route] forbidden path ", subpath);
    res.status(403).json({
      error: true,
      msg: "you are not allowed to request " + subpath,
    });
    return;
  }

  const authResult = auth(req, ModelProvider.GPT);
  if (authResult.error) {
    res.status(401).json(authResult);
    return;
  }

  try {
    // Clone the request to read it multiple times
    const clonedRequest = req.clone();
    const body = await clonedRequest.json();
    console.log("[API Route] OpenAI request payload:", body);

    console.log("[OpenAI Route] Request body:", JSON.stringify(body, null, 2));

    // Extract just the user's text from the messages array
    const userMessages = body.messages?.filter((m) => m.role === "user");
    const userText = userMessages?.pop()?.content || "";
    console.log("user text----", userText);

    // Forward the request to your Cloudflare Worker endpoint with original request body
    const workerResponse = await fetch("https://vgcassistant.com/bot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.get("authorization") && {
          Authorization: req.headers.get("authorization")!,
        }),
      },
      body: JSON.stringify({
        query: userText,
        model: body.model,
        temperature: body.temperature,
      }),
    });

    console.log(
      "[API Route] VGC Assistant response status:",
      workerResponse.status,
    );

    // Log the worker response for debugging
    console.log(
      "[OpenAI Route] Worker response status:",
      workerResponse.status,
    );

    // Handle error responses
    if (!workerResponse.ok) {
      let errorMessage;
      try {
        const errorData = await workerResponse.json();
        console.error("[OpenAI Route] Worker error data:", errorData);
        errorMessage = errorData.error || errorData.message || "Unknown error";
      } catch (e) {
        const textError = await workerResponse.text();
        console.error("[OpenAI Route] Worker error text:", textError);
        errorMessage = textError || "Failed to get error details";
      }

      return new Response(
        JSON.stringify({
          error: "Worker request failed",
          status: workerResponse.status,
          details: errorMessage,
        }),
        {
          status: workerResponse.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Handle regular response
    try {
      const responseData = await workerResponse.json();
      // Extract the content array and join it into a single string
      const content = responseData.structured.join("\n");
      return new Response(content, {
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (e) {
      console.error("[OpenAI Route] Error parsing worker response:", e);
      const textResponse = await workerResponse.text();
      console.error("[OpenAI Route] Raw worker response:", textResponse);
      return new Response(
        JSON.stringify({
          error: "Invalid response from worker",
          details: "Worker returned invalid JSON",
          raw: textResponse,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }
  } catch (error) {
    console.error("[API Route] Error processing request:", error);
    console.error("[OpenAI Route] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
