import { NextRequest } from "next/server";
import { POST as handleRequest } from "../route";

export const runtime = "edge";

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  // Log path for debugging
  console.log("[OpenAI Route] Handling path:", params.path?.join("/"));

  // Forward to main handler
  return handleRequest(req);
}

export const GET = POST;
