import { NextApiRequest, NextApiResponse } from "next";
import { OpenAIListModelResponse } from "@/app/client/platforms/openai";
import { getServerSideConfig } from "@/app/config/server";
import { ModelProvider, OpenaiPath } from "@/app/constant";
import { prettyObject } from "@/app/utils/format";
import { auth } from "./auth";
import { requestOpenai } from "./common";

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
    // Read the body once
    const bodyData = await req.json();

    let body;
    if (req.method === "POST" && subpath !== OpenaiPath.ListModelPath) {
      body = bodyData;

      console.log("[OpenAI Route] body ", body);

      if (body && Array.isArray(body.messages)) {
        const lastUserMessage = body.messages.slice(-1)?.pop()?.content;
        console.log("[OpenAI Route] lastUserMessage ", lastUserMessage);
        if (lastUserMessage) {
          body.query = lastUserMessage;
        } else {
          console.warn(
            "[OpenAI Route] No user message found in messages array.",
          );
        }
      } else {
        console.warn("[OpenAI Route] No messages array found in request body.");
      }
    }

    const modifiedReq = {
      ...req,
      body: body ? JSON.stringify(body) : req.body,
      headers: {
        ...req.headers,
        "Content-Type": "application/json",
      },
    };

    const response = await requestOpenai(modifiedReq);

    if (subpath === OpenaiPath.ListModelPath && response.status === 200) {
      const resJson = (await response.json()) as OpenAIListModelResponse;
      const availableModels = getModels(resJson);
      res.status(response.status).json(availableModels);
      return;
    }

    res.status(response.status).send(response.body);
  } catch (e) {
    console.error("[OpenAI] ", e);
    res.status(500).json(prettyObject(e));
  }
}
