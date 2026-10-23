
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_INSTRUCTION = `
You are EduSphere AI Helpdesk, a friendly assistant for college students.
Help with studying, courses, assignments, attendance policies, and college life.
Use simple, supportive language.
Never invent college-specific rules, grades, deadlines, or attendance records.
You cannot access private student records in this version.
If asked about personal records, direct the student to their authenticated portal
or teacher. If unsure, say so instead of guessing.
`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing from the server environment." },
        { status: 500 }
      );
    }

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("messages" in body) ||
      !Array.isArray(body.messages)
    ) {
      return NextResponse.json(
        { error: "Please send a valid chat message." },
        { status: 400 }
      );
    }

    const rawMessages = body.messages as unknown[];

    if (rawMessages.length === 0 || rawMessages.length > 12) {
      return NextResponse.json(
        { error: "Send between 1 and 12 recent messages." },
        { status: 400 }
      );
    }

    const messages: ChatMessage[] = [];

    for (const item of rawMessages) {
      if (typeof item !== "object" || item === null) {
        return NextResponse.json(
          { error: "A chat message is invalid." },
          { status: 400 }
        );
      }

      const { role, content } = item as {
        role?: unknown;
        content?: unknown;
      };

      if (
        (role !== "user" && role !== "assistant") ||
        typeof content !== "string" ||
        !content.trim() ||
        content.length > 4000
      ) {
        return NextResponse.json(
          { error: "A message is empty, invalid, or too long." },
          { status: 400 }
        );
      }

      messages.push({ role, content: content.trim() });
    }

    if (messages[messages.length - 1].role !== "user") {
      return NextResponse.json(
        { error: "The latest message must be from the user." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let response: Response;

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }],
            },
            contents: messages.map((message) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }],
            })),
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.7,
            },
          }),
          signal: controller.signal,
        }
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          {
            error:
              "Gemini did not respond within 20 seconds. Please try again.",
          },
          { status: 504 }
        );
      }

      console.error("Gemini connection error:", error);

      return NextResponse.json(
        {
          error:
            "Could not connect to Gemini. Check your network and try again.",
        },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const result: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        typeof result === "object" &&
        result !== null &&
        "error" in result &&
        typeof result.error === "object" &&
        result.error !== null &&
        "message" in result.error &&
        typeof result.error.message === "string"
          ? result.error.message
          : "Gemini returned an error.";

      // Log the provider's error, but never log the API key.
      console.error("Gemini API response:", response.status, errorMessage);

      return NextResponse.json(
        {
          error: `Gemini API error (${response.status}): ${errorMessage}`,
        },
        { status: 502 }
      );
    }

    const candidates =
      typeof result === "object" && result !== null && "candidates" in result
        ? result.candidates
        : null;

    const firstCandidate =
      Array.isArray(candidates) && candidates.length > 0
        ? candidates[0]
        : null;

    const parts =
      typeof firstCandidate === "object" &&
      firstCandidate !== null &&
      "content" in firstCandidate &&
      typeof firstCandidate.content === "object" &&
      firstCandidate.content !== null &&
      "parts" in firstCandidate.content &&
      Array.isArray(firstCandidate.content.parts)
        ? firstCandidate.content.parts
        : [];

    const reply = parts
      .map((part: { text?: unknown }) =>
        typeof part.text === "string" ? part.text : ""
      )
      .join("")
      .trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Gemini returned no text. Please try another question." },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Helpdesk route error:", error);

    return NextResponse.json(
      { error: "An unexpected Helpdesk error occurred. Please try again." },
      { status: 500 }
    );
  }
}
