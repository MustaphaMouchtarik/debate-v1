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
{"winner": "player1" | "player2", "reason": "<short explanation>"}

IMPORTANT: The "winner" field must be the literal string "player1" or "player2" —
NOT the debater's name, NOT "Player 1" with a space, NOT the side they argued.`;

  const userPrompt = `Topic: ${input.topic}

player1 = ${input.player1.name} (arguing ${input.player1.side})
player2 = ${input.player2.name} (arguing ${input.player2.side})

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
  // Strip markdown fences (```json ... ``` or ``` ... ```) wherever they appear,
  // not just at the exact start/end — NIM/Llama sometimes adds stray whitespace
  // or a leading "Here is the verdict:" before the fence.
  let cleaned = raw.replace(/```json/gi, "```").replace(/```/g, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: the model may have wrapped the JSON in prose. Grab the first
    // {...} block and try again.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        throw new Error(`Failed to parse AI judge response as JSON. Raw output: ${raw}`);
      }
    } else {
      throw new Error(`Failed to parse AI judge response as JSON. Raw output: ${raw}`);
    }
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("winner" in parsed) ||
    !("reason" in parsed)
  ) {
    throw new Error("AI judge response missing required fields");
  }

  const rawResult = parsed as { winner: unknown; reason: unknown };
  const winner = normalizeWinner(rawResult.winner, input.player1.name, input.player2.name);

  if (!winner) {
    throw new Error(
      `AI judge returned an invalid winner value: ${JSON.stringify(rawResult.winner)}`
    );
  }

  return { winner, reason: String(rawResult.reason ?? "") };
}

/**
 * Models like Llama-3.1 (via NIM) frequently ignore the "player1"/"player2"
 * enum instruction and instead return the debater's actual name, "Player 1",
 * "Player 2", the side ("FOR"/"AGAINST"), or similar variations. This maps
 * any of those back to the literal "player1" | "player2" the app expects,
 * instead of hard-failing on anything that isn't an exact match.
 */
function normalizeWinner(
  value: unknown,
  player1Name: string,
  player2Name: string
): "player1" | "player2" | null {
  if (typeof value !== "string") return null;

  const v = value.trim().toLowerCase();
  const p1 = player1Name.trim().toLowerCase();
  const p2 = player2Name.trim().toLowerCase();

  // Exact / near-exact matches for the intended literal values.
  if (v === "player1" || v === "player 1" || v === "player_1" || v === "1") {
    return "player1";
  }
  if (v === "player2" || v === "player 2" || v === "player_2" || v === "2") {
    return "player2";
  }

  // Model echoed the debater's actual name back.
  if (v === p1 || (p1.length > 0 && v.includes(p1))) return "player1";
  if (v === p2 || (p2.length > 0 && v.includes(p2))) return "player2";

  // Fallback: does the string merely mention "player1"/"player2" somewhere
  // inside a longer sentence (e.g. "Player1 wins because...")?
  if (/\bplayer\s*1\b/.test(v)) return "player1";
  if (/\bplayer\s*2\b/.test(v)) return "player2";

  return null;
}