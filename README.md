# CODE MIND

An AI coding companion with three parts:

- **Chat** — ask coding questions, get explanations and snippets.
- **Build & Run** — describe an app in plain English (e.g. *"create a car game"*)
  and CODE MIND generates the HTML, CSS and JavaScript for it, then runs it
  instantly in a live preview. You can also edit the code by hand at any time.
- **Settings** — pick the model and customize the chat system prompt.

This project was originally scaffolded with [Lovable](https://lovable.dev).
It now talks directly to Groq's API with your own key, so it runs fully on
your own machine and isn't limited by Lovable's daily AI credits.

## Setup

You need Node.js installed — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
if you don't have it.

1. Install dependencies:

   ```sh
   npm i
   ```

2. Create a `.env` file in the project root with your Groq key:

   ```sh
   GROQ_API_KEY=gsk_...your-key-here...
   ```

   Get a key at https://console.groq.com/keys. **Never** commit this
   file or put the key in any frontend code — it's only ever read on the
   server (in `src/routes/api/chat.ts` and `src/routes/api/build.ts`).

3. Run it:

   ```sh
   npm run dev
   ```

4. Open the URL it prints (usually http://localhost:3000).

## How Build & Run works

The editor page has a prompt bar at the top. Type what you want ("create a
car game", "make a to-do list", "add a restart button"), hit **Generate**,
and CODE MIND rewrites the HTML/CSS/JS to match — reusing what's already
there when you're iterating rather than starting over. Everything runs
client-side in a sandboxed `<iframe>`, so it works for games, small tools,
canvas animations, and UI mockups without any build step.

You can still switch to any tab (HTML/CSS/JS) and hand-edit the code, then
press **Run** to refresh the preview.

## Changing the model

Open **Settings** in the app and change the model field to any Groq chat
model you have access to (e.g. `openai/gpt-oss-120b`, `openai/gpt-oss-20b`,
`qwen/qwen3.6-27b`). The Build & Run generator uses `openai/gpt-oss-120b`
by default — you can change that in `src/routes/api/build.ts` if you want
a different model there too. Groq retires older models on a rolling basis
(they emailed the last round of retirements ~2 months ahead) — if chat
suddenly starts erroring, check https://console.groq.com/docs/models for
current model IDs before anything else.

## Deploying

Because the AI calls happen on the server (not the browser), deploy this
like any other Node app (Vercel, Render, Fly.io, a VPS, etc.) and set the
`GROQ_API_KEY` environment variable in that platform's dashboard instead
of a local `.env` file. On Vercel: Project Settings → Environment Variables
→ add `GROQ_API_KEY`, then redeploy.
