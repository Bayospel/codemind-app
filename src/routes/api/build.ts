import { createFileRoute } from "@tanstack/react-router";
import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

const BUILD_MODEL = "openai/gpt-oss-120b";

const FilesSchema = z.object({
  html: z
    .string()
    .describe(
      "The full HTML body markup only (no <html>/<head>/<body> tags, no <style> or <script> tags).",
    ),
  css: z.string().describe("The full CSS for the page."),
  js: z
    .string()
    .describe(
      "The full JavaScript for the page. Runs after the DOM is parsed. No import/export statements — plain browser script only.",
    ),
  summary: z
    .string()
    .describe("One short sentence describing what was built or changed."),
});

type BuildRequestBody = {
  description?: unknown;
  files?: { html?: unknown; css?: unknown; js?: unknown };
};

export const Route = createFileRoute("/api/build")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: BuildRequestBody;
        try {
          body = (await request.json()) as BuildRequestBody;
        } catch {
          return new Response("Invalid request body", { status: 400 });
        }

        const description =
          typeof body.description === "string" ? body.description.trim() : "";
        if (!description) {
          return new Response("Describe what you want to build.", {
            status: 400,
          });
        }

        const key = process.env["GROQ_API_KEY"];
        if (!key) {
          return new Response(
            "AI is not configured. Set GROQ_API_KEY in your .env file and restart the server.",
            { status: 500 },
          );
        }

        const existing = {
          html: typeof body.files?.html === "string" ? body.files.html : "",
          css: typeof body.files?.css === "string" ? body.files.css : "",
          js: typeof body.files?.js === "string" ? body.files.js : "",
        };

        const groq = createGroq({ apiKey: key });

        try {
          const result = await generateObject({
            model: groq(BUILD_MODEL),
            schema: FilesSchema,
            system: `You are CODE MIND's Build & Run engine. You write small, complete, self-contained browser apps (games, tools, demos, UI mockups) that run instantly in a sandboxed iframe using only HTML, CSS and vanilla JavaScript — no build step, no external libraries, no network requests, no frameworks.

Rules:
- Return a FULL replacement for each of html, css and js — not a diff or a snippet.
- The html field is only the contents that go inside <body>. Never include <html>, <head>, <body>, <style> or <script> tags.
- All interactivity goes in js. It runs after the DOM is ready. Use plain DOM APIs (getElementById, addEventListener, canvas, requestAnimationFrame, etc). No import/export, no require, no fetch to external URLs.
- All visual styling goes in css.
- If the user is asking to change or add to an existing app, keep what already works and modify only what's needed — reuse element IDs from the existing HTML where sensible.
- If the user's request is a game (e.g. "car game", "snake game"), make it genuinely playable: clear controls (keyboard and/or on-screen buttons), a visible score or state, and a win/lose or restart condition. Prefer <canvas> for anything with movement or graphics.
- Keep code readable and reasonably commented, but prioritize it actually working over cleverness.`,
            prompt: `User request: ${description}

Current files (may be empty if starting fresh):

--- html (body contents) ---
${existing.html || "(empty)"}

--- css ---
${existing.css || "(empty)"}

--- js ---
${existing.js || "(empty)"}`,
            abortSignal: request.signal,
          });

          return Response.json(result.object);
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return new Response("Cancelled", { status: 499 });
          }
          const message =
            error instanceof Error ? error.message : "Build request failed";
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});
