import { ApiPath } from "@/app/constant";
import { NextRequest } from "next/server";
import { handle as azureHandler } from "../../azure";
import { handle as googleHandler } from "../../google";
import { handle as anthropicHandler } from "../../anthropic";
import { handle as baiduHandler } from "../../baidu";
import { handle as bytedanceHandler } from "../../bytedance";
import { handle as alibabaHandler } from "../../alibaba";
import { handle as moonshotHandler } from "../../moonshot";
import { handle as stabilityHandler } from "../../stability";
import { handle as iflytekHandler } from "../../iflytek";
import { handle as deepseekHandler } from "../../deepseek";
import { handle as siliconflowHandler } from "../../siliconflow";
import { handle as xaiHandler } from "../../xai";
import { handle as chatglmHandler } from "../../glm";
import { handle as proxyHandler } from "../../proxy";

async function handle(
  req: NextRequest,
  { params }: { params: { provider?: string; path?: string[] } },
) {
  console.log(`[${params?.provider} Route] params:`, params);

  // Ensure we have a provider
  if (!params?.provider) {
    return new Response(
      JSON.stringify({ error: "Missing provider in request params." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Check if the provider is "openai"
  if (params.provider.toLowerCase() === "openai") {
    try {
      console.log("[OpenAI Route] Request path:", params.path);

      // Parse the request body with error handling
      let body;
      try {
        body = await req.json();
        console.log(
          "[OpenAI Route] Request body:",
          JSON.stringify(body, null, 2),
        );
      } catch (error) {
        console.error("[OpenAI Route] Error parsing request body:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to parse request body as JSON",
            details: error instanceof Error ? error.message : "Unknown error",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Extract just the user's text from the messages array
      const userText =
        body.messages?.find((m) => m.role === "user")?.content || "";

      // Forward the request to your Cloudflare Worker endpoint
      const workerResponse = await fetch("https://vgcassistant.com/bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(req.headers.get("authorization") && {
            Authorization: req.headers.get("authorization")!,
          }),
        },
        body: JSON.stringify({
          query: userText, // Just send the user's text
        }),
      });

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
          errorMessage =
            errorData.error || errorData.message || "Unknown error";
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

  // For all other providers, use their respective handlers.
  const apiPath = `/api/${params.provider}`;
  console.log(`[${params.provider} Route] Using provider handler.`, params);

  switch (apiPath) {
    case ApiPath.Azure:
      return azureHandler(req, { params });
    case ApiPath.Google:
      return googleHandler(req, { params });
    case ApiPath.Anthropic:
      return anthropicHandler(req, { params });
    case ApiPath.Baidu:
      return baiduHandler(req, { params });
    case ApiPath.ByteDance:
      return bytedanceHandler(req, { params });
    case ApiPath.Alibaba:
      return alibabaHandler(req, { params });
    case ApiPath.Moonshot:
      return moonshotHandler(req, { params });
    case ApiPath.Stability:
      return stabilityHandler(req, { params });
    case ApiPath.Iflytek:
      return iflytekHandler(req, { params });
    case ApiPath.DeepSeek:
      return deepseekHandler(req, { params });
    case ApiPath.XAI:
      return xaiHandler(req, { params });
    case ApiPath.ChatGLM:
      return chatglmHandler(req, { params });
    case ApiPath.SiliconFlow:
      return siliconflowHandler(req, { params });
    default:
      return proxyHandler(req, { params });
  }
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
export const preferredRegion = [
  "arn1",
  "bom1",
  "cdg1",
  "cle1",
  "cpt1",
  "dub1",
  "fra1",
  "gru1",
  "hnd1",
  "iad1",
  "icn1",
  "kix1",
  "lhr1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
];
