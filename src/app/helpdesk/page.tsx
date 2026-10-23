
"use client";

import { FormEvent, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Explain database normalization in simple terms.",
  "How can I prepare for my exams?",
  "How should I manage my assignments?",
  "Explain primary keys and foreign keys.",
];

export default function HelpdeskPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! 👋 Welcome to EduSphere AI Helpdesk. I'm here to help with your studies, courses, assignments, and college-related questions. What would you like to know?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(
    event?: FormEvent<HTMLFormElement>,
    suggestedQuestion?: string
  ) {
    event?.preventDefault();

    const question = (suggestedQuestion ?? input).trim();

    if (!question || loading) return;

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: question },
    ];

    setMessages(updatedMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/helpdesk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages
            .filter((message) => message.role !== "assistant" ||
              messages.includes(message))
            .slice(-12)
            .map((message) => ({
              role: message.role,
              content: message.content,
            })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "The Helpdesk could not respond. Please try again."
        );
      }

      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("The AI returned an empty reply. Please try again.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white">
                ✨
              </div>
              <div>
                <h1 className="text-2xl font-bold">EduSphere AI Helpdesk</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Your friendly academic assistant
                </p>
              </div>
            </div>
          </div>

          <a
            href="/"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            ← Home
          </a>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <div>
              <p className="font-semibold">AI Study Assistant</p>
              <p className="text-xs text-slate-500">
                Ask questions and learn at your own pace
              </p>
            </div>
          </div>

          <div
            className="flex min-h-[360px] max-h-[55vh] flex-col gap-4 overflow-y-auto p-4 sm:p-6"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[80%] ${
                    message.role === "user"
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-bl-md bg-slate-100 text-slate-800"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start" role="status">
                <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-600">
                  <span className="animate-pulse">
                    EduSphere AI is thinking...
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  const lastUserMessage = [...messages]
                    .reverse()
                    .find((message) => message.role === "user");

                  if (lastUserMessage) {
                    void sendMessage(undefined, lastUserMessage.content);
                  }
                }}
                disabled={loading}
                className="mt-2 font-semibold underline disabled:opacity-50"
              >
                Try again
              </button>
            </div>
          )}

          <div className="border-t border-slate-100 p-4 sm:p-6">
            <form
              onSubmit={(event) => void sendMessage(event)}
              className="flex items-end gap-2"
            >
              <label htmlFor="helpdesk-message" className="sr-only">
                Your question
              </label>
              <textarea
                id="helpdesk-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask your academic question..."
                rows={2}
                maxLength={4000}
                disabled={loading}
                className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "..." : "Send"}
              </button>
            </form>

            <p className="mt-2 text-xs text-slate-400">
              Press Enter to send, or Shift + Enter for a new line.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-600">
            TRY ASKING
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={loading}
                onClick={() => void sendMessage(undefined, suggestion)}
                className="rounded-xl border border-slate-200 bg-white p-4 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="mr-2 text-blue-600">✦</span>
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        <footer className="pb-4 text-center text-xs text-slate-400">
          EduSphere AI can make mistakes. Verify important academic information
          with your teachers or official college resources.
        </footer>
      </div>
    </main>
  );
}
