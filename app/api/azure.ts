import { ModelProvider } from "@/app/constant";
import { prettyObject } from "@/app/utils/format";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { requestOpenai } from "./common";

export async function handle(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  console.log("[Azure Route] params ", params);

  if (req.method === "OPTIONS") {
    return NextResponse.json({ body: "OK" }, { status: 200 });
  }

  const subpath = params.path.join("/");

  const authResult = auth(req, ModelProvider.GPT);
  if (authResult.error) {
    return NextResponse.json(authResult, {
      status: 401,
    });
  }

  /**
   *  on azure openai service
   *  temperature, top_p, presence_penalty, frequency_penalty, logprobs, top_logprobs, logit_bias, max_tokens currently unsupported with reasoning models
   *  https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/reasoning?tabs=python-secure#not-supported
   */
  const model = (params.path[1] || '').toLowerCase().trim();
  console.log("[Azure] model", model)
  if (model.includes('o4') || model.includes('o3') || model.includes('o1')) {
    try {
      let body = await req.json();
      body = {
        ...body,
        temperature: undefined,
        top_p: undefined,
        presence_penalty: undefined,
        frequency_penalty: undefined,
        logprobs: undefined,
        top_logprobs: undefined,
        logit_bias: undefined,
        reasoning_effort: "medium",
      };
      req = new NextRequest(req.url, {
        method: req.method,
        headers: req.headers,
        body: JSON.stringify(body),
        cache: req.cache,
        credentials: req.credentials,
        integrity: req.integrity,
        keepalive: req.keepalive,
        mode: req.mode,
        redirect: req.redirect,
        referrer: req.referrer,
        referrerPolicy: req.referrerPolicy,
        signal: req.signal
      });
      console.log("[Azure] new reasoning model req body", body)
    } catch (e) {
      console.error("[Azure] ", e);
    }
  }

  try {
    return await requestOpenai(req);
  } catch (e) {
    console.error("[Azure] ", e);
    return NextResponse.json(prettyObject(e));
  }
}
