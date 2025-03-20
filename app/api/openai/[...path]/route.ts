import { NextRequest } from "next/server";
import { handleRequest } from "../handler";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

export const GET = POST;
