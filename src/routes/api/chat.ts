import { createFileRoute } from "@tanstack/react-router";
import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { DEFAULT_SETTINGS } from "@/lib/settings";

type ChatSettings = {
  model?: unknown;
  systemPrompt?: unknown;
};

type ChatRequestBody = { messages?: unknown; settings?: ChatSettings };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response("Invalid request body", { status: 400 });
        }
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["GROQ_API_KEY"];
        if (!key) {
          return new Response(
            "AI is not configured. Set GROQ_API_KEY in your .env file and restart the server.",
            { status: 500 },
          );
        }

        const s = body.settings ?? {};
        const model =
          typeof s.model === "string" && s.model.trim()
            ? s.model.trim()
            : DEFAULT_SETTINGS.model;
        const system =
          typeof s.systemPrompt === "string" && s.systemPrompt.trim()
            ? s.systemPrompt
            : DEFAULT_SETTINGS.systemPrompt;

        const groq = createGroq({ apiKey: key });

        try {
          const result = streamText({
            model: groq(model),
            system,
            messages: await convertToModelMessages(body.messages as UIMessage[]),
            abortSignal: request.signal,
          });

          return result.toUIMessageStreamResponse({
            originalMessages: body.messages as UIMessage[],
            onError: (error) =>
              error instanceof Error ? error.message : "AI request failed",
          });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return new Response("Cancelled", { status: 499 });
          }
          const message =
            error instanceof Error ? error.message : "AI request failed";
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});
