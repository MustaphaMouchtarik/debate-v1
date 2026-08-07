import OpenAI from "openai";

// AI_BASE_URL lets you point this at any OpenAI-compatible endpoint instead of
// api.openai.com — e.g. local Ollama (http://localhost:11434/v1) or Ollama Cloud.
// AI_API_KEY is required for OpenAI/Ollama Cloud; local Ollama ignores it, but the
// SDK requires *some* string to be present, so we fall back to a placeholder.
const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "ollama-local",
  baseURL: process.env.AI_BASE_URL || undefined, // undefined -> SDK default (api.openai.com)
});

export interface JudgeInput {
  topic: string;
  player1: { name: string; side: "FOR" | "AGAINST" };
  player2: { name: string; side: "FOR" | "AGAINST" };
  conversation: { authorName: string; round: number; message: string }[];
}

export interface JudgeResult {
  winner: "player1" | "player2";
  reason: string;
}

/**
 * Sends the full debate transcript to the model and asks for a strict JSON verdict.
 * Throws if the model output cannot be parsed as valid JSON matching the expected shape.
 */
export async function judgeDebate(input: JudgeInput): Promise<JudgeResult> {
  const transcript = input.conversation
    .map((m) => `Round ${m.round} — ${m.authorName}: ${m.message}`)
    .join("\n");

  const systemPrompt = `You are an impartial debate judge. Evaluate the debate strictly on:
- Logical consistency
- Rebuttal quality
- Persuasiveness
- Relevance
- Clarity

Return ONLY a JSON object, with no extra text, no markdown fences, matching exactly this shape:
{"winner": "player1" | "player2", "reason": "<short explanation>"}`;

  const userPrompt = `Topic: ${input.topic}

Player 1: ${input.player1.name} (arguing ${input.player1.side})
Player 2: ${input.player2.name} (arguing ${input.player2.side})

Full debate transcript:
${transcript}

Judge objectively and return only the JSON verdict.`;

  const model = process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const supportsJsonMode = process.env.AI_JSON_MODE !== "false"; // set to "false" for Ollama models that reject response_format

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...(supportsJsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "";
  const cleaned = raw.replace(/^```json\s*|```$/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse AI judge response as JSON");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("winner" in parsed) ||
    !("reason" in parsed)
  ) {
    throw new Error("AI judge response missing required fields");
  }

  const result = parsed as JudgeResult;
  if (result.winner !== "player1" && result.winner !== "player2") {
    throw new Error("AI judge returned an invalid winner value");
  }

  return result;
}
