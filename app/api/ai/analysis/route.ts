import { NextResponse } from "next/server";
import { getMockAnalysis } from "@/services/ai/mockAnalysis";
import type { GenerateAnalysisInput } from "@/services/ai/generateAnalysis";

export async function POST(request: Request) {
  const payload = (await request.json()) as GenerateAnalysisInput;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(await getMockAnalysis(payload.issue, payload.option, payload.politicians));
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are VoteIt's civic discussion analyst. Return concise Korean JSON only with alignment, difference, pros, cons, politicianNotes, closing."
          },
          {
            role: "user",
            content: JSON.stringify({
              issue: payload.issue.title,
              summary: payload.issue.summary,
              option: payload.option.title,
              pros: payload.option.pros,
              cons: payload.option.cons,
              politicians: payload.politicians ?? []
            })
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "voteit_analysis",
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["alignment", "difference", "pros", "cons", "politicianNotes", "closing"],
              properties: {
                alignment: { type: "string" },
                difference: { type: "string" },
                pros: { type: "array", items: { type: "string" } },
                cons: { type: "array", items: { type: "string" } },
                politicianNotes: { type: "array", items: { type: "string" } },
                closing: { type: "string" }
              }
            }
          }
        }
      })
    });

    if (!response.ok) {
      return NextResponse.json(await getMockAnalysis(payload.issue, payload.option, payload.politicians));
    }

    const json = await response.json();
    const content = json.output_text ? JSON.parse(json.output_text) : null;

    return NextResponse.json({
      optionId: payload.option.id,
      ...content
    });
  } catch {
    return NextResponse.json(await getMockAnalysis(payload.issue, payload.option, payload.politicians));
  }
}
