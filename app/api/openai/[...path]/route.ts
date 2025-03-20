import { NextRequest } from "next/server";
import { OpenAIHandler } from "../route";

export const runtime = "edge";

// Create path handler
export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[OpenAI Route] Path params:", params.path);

  // Initialize handler
  const handler = new OpenAIHandler();

  // Handle all OpenAI API paths
  const response = await handler.handle(req);

  return response;
}

export const GET = POST;
