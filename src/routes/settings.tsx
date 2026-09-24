import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type AiSettings,
} from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CODE MIND" },
      {
        name: "description",
        content: "Configure the AI model and system prompt for CODE MIND.",
      },
      { property: "og:title", content: "Settings — CODE MIND" },
      {
        property: "og:description",
        content: "Configure the AI model and system prompt for CODE MIND.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="font-mono text-lg font-bold tracking-widest text-foreground">
        SETTINGS
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        AI configuration for the chat assistant and Build &amp; Run generator.
        Saved on this device.
      </p>

      <div className="mt-6 rounded-md border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        This app calls Groq directly using your own key. Set{" "}
        <code className="rounded bg-secondary px-1 py-0.5 font-mono">
          GROQ_API_KEY
        </code>{" "}
        in a <code className="rounded bg-secondary px-1 py-0.5 font-mono">.env</code>{" "}
        file on the server and restart it — see the README. No Lovable
        credits are used.
      </div>

      <div className="mt-8 space-y-6">
        <div>
          <label
            htmlFor="model"
            className="mb-1.5 block font-mono text-xs font-medium text-muted-foreground"
          >
            MODEL
          </label>
          <input
            id="model"
            value={settings.model}
            onChange={(e) => update("model", e.target.value)}
            className="w-full rounded-md border border-input bg-card px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Default: {DEFAULT_SETTINGS.model}. Any current Groq chat-model
            name works here (e.g. openai/gpt-oss-120b, openai/gpt-oss-20b,
            qwen/qwen3.6-27b) — check console.groq.com/docs/models for the
            current list, since Groq retires older models over time.
          </p>
        </div>

        <div>
          <label
            htmlFor="systemPrompt"
            className="mb-1.5 block font-mono text-xs font-medium text-muted-foreground"
          >
            SYSTEM PROMPT
          </label>
          <textarea
            id="systemPrompt"
            value={settings.systemPrompt}
            onChange={(e) => update("systemPrompt", e.target.value)}
            rows={6}
            className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 font-mono text-sm leading-relaxed text-foreground outline-none focus:border-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Tells the AI how to behave in every conversation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="rounded-md bg-primary px-4 py-2 font-mono text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Save settings
          </button>
          <button
            onClick={() => setSettings(DEFAULT_SETTINGS)}
            className="rounded-md px-4 py-2 font-mono text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Restore defaults
          </button>
          {saved && (
            <span className="flex items-center gap-1 font-mono text-xs text-primary">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
