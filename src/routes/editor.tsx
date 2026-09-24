import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Code2, Globe, Loader2, Play, RotateCcw, Sparkles } from "lucide-react";

const STORAGE_KEY = "codemind-code";

type CodeFiles = { html: string; css: string; js: string };
type Tab = keyof CodeFiles;

const DEFAULT_CODE: CodeFiles = {
  html: `<h1>Hello from CODE MIND</h1>
<p>Describe an app below and hit Generate — or edit the HTML, CSS and JS tabs by hand. The preview updates live.</p>
<button id="btn">Click me</button>`,
  css: `body {
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  display: grid;
  place-items: center;
  min-height: 100vh;
  text-align: center;
}

button {
  background: #4ade80;
  border: none;
  color: #052e16;
  padding: 0.6rem 1.4rem;
  border-radius: 0.5rem;
  font-weight: 700;
  cursor: pointer;
}`,
  js: `document.getElementById("btn").addEventListener("click", () => {
  alert("It works!");
});`,
};

const TABS: { id: Tab; label: string }[] = [
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "js", label: "JavaScript" },
];

const EXAMPLE_PROMPTS = [
  "Build a simple car racing game with arrow-key controls",
  "Make a to-do list with add, complete and delete",
  "Create a bouncing-ball animation on a canvas",
];

function loadCode(): CodeFiles {
  if (typeof window === "undefined") return DEFAULT_CODE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CODE;
    const parsed = JSON.parse(raw) as Partial<CodeFiles>;
    return {
      html: typeof parsed.html === "string" ? parsed.html : DEFAULT_CODE.html,
      css: typeof parsed.css === "string" ? parsed.css : DEFAULT_CODE.css,
      js: typeof parsed.js === "string" ? parsed.js : DEFAULT_CODE.js,
    };
  } catch {
    return DEFAULT_CODE;
  }
}

function buildDoc(code: CodeFiles): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>${code.css}</style>
</head>
<body>
${code.html}
<script>
${code.js}
<\/script>
</body>
</html>`;
}

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Build & Run — CODE MIND" },
      {
        name: "description",
        content:
          "Describe an app in plain English and CODE MIND generates the HTML, CSS and JavaScript — then run it instantly in a live preview.",
      },
      { property: "og:title", content: "Build & Run — CODE MIND" },
      {
        property: "og:description",
        content:
          "Describe an app in plain English and CODE MIND generates the HTML, CSS and JavaScript — then run it instantly in a live preview.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditorPage,
});

function EditorPage() {
  const [code, setCode] = useState<CodeFiles>(DEFAULT_CODE);
  const [tab, setTab] = useState<Tab>("html");
  const [doc, setDoc] = useState(() => buildDoc(DEFAULT_CODE));
  const [loaded, setLoaded] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = loadCode();
    setCode(saved);
    setDoc(buildDoc(saved));
    setLoaded(true);
  }, []);

  // Debounced live preview + persistence
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      setDoc(buildDoc(code));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(code));
      } catch {
        // storage full — editing still works
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code, loaded]);

  const tabBar = useMemo(
    () => (
      <div className="flex items-center gap-1 border-b border-border bg-card px-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-md px-3 py-2 font-mono text-xs transition-colors ${
              tab === t.id
                ? "bg-background text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    ),
    [tab],
  );

  async function generate() {
    const description = prompt.trim();
    if (!description || generating) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, files: code }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data === "string" ? data : data?.error || "Build failed.",
        );
      }
      const next: CodeFiles = {
        html: typeof data.html === "string" ? data.html : code.html,
        css: typeof data.css === "string" ? data.css : code.css,
        js: typeof data.js === "string" ? data.js : code.js,
      };
      setCode(next);
      setDoc(buildDoc(next));
      setLastSummary(
        typeof data.summary === "string" ? data.summary : "Done.",
      );
      setPrompt("");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setGenError(e instanceof Error ? e.message : "Build failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Generate bar */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 flex-shrink-0 text-primary" />
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void generate();
              }
            }}
            placeholder='Describe what to build, e.g. "create a car game"…'
            disabled={generating}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
          />
          <button
            onClick={() => void generate()}
            disabled={generating || !prompt.trim()}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] text-muted-foreground">
            Try:
          </span>
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              disabled={generating}
              className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
        {genError && (
          <p className="mt-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
            {genError}
          </p>
        )}
        {!genError && lastSummary && (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            ✓ {lastSummary}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Editor pane */}
        <div className="flex min-h-[50vh] flex-1 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border bg-card pr-2">
            {tabBar}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDoc(buildDoc(code))}
                title="Run now"
                className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 font-mono text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Play className="h-3 w-3" />
                Run
              </button>
              <button
                onClick={() => {
                  setCode(DEFAULT_CODE);
                  setDoc(buildDoc(DEFAULT_CODE));
                  setLastSummary(null);
                  setGenError(null);
                }}
                title="Reset to starter code"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>
          <textarea
            value={code[tab]}
            onChange={(e) => setCode((c) => ({ ...c, [tab]: e.target.value }))}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none bg-background p-4 font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
            placeholder={`Write your ${tab.toUpperCase()} here…`}
            aria-label={`${tab.toUpperCase()} editor`}
          />
        </div>

        {/* Preview pane */}
        <div className="flex min-h-[50vh] flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">
              Live Preview
            </span>
            <Code2 className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <iframe
            title="Live preview"
            sandbox="allow-scripts"
            srcDoc={doc}
            className="min-h-0 flex-1 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
