import { NextRequest } from "next/server";
import { OpenAIHandler } from "@/app/api/openai/route";

async function handle(
  req: NextRequest,
  { params }: { params: { provider: string; path: string[] } },
) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Provider ${requestId}] Request:`, {
    provider: params.provider,
    path: params.path,
    method: req.method,
    url: req.url,
  });

  // Force all requests to use OpenAI handler
  try {
    console.log(`[Provider ${requestId}] Routing to OpenAI handler`);

    // Create OpenAI handler instance
    const openaiHandler = new OpenAIHandler();
    const response = await openaiHandler.handle(req, params);

    console.log(
      `[Provider ${requestId}] OpenAI handler response status:`,
      response.status,
    );
    return response;
  } catch (error) {
    console.error(`[Provider ${requestId}] Handler error:`, error);
    return new Response(
      JSON.stringify({
        error: true,
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
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
