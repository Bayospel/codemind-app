export type AiSettings = {
  model: string;
  systemPrompt: string;
};

export const DEFAULT_SETTINGS: AiSettings = {
  model: "openai/gpt-oss-120b",
  systemPrompt:
    "You are CODE MIND, an expert AI programming assistant. Answer coding questions clearly and concisely. Format code in fenced markdown blocks with the language name. When helpful, provide complete runnable HTML/CSS/JS examples the user can paste into the Build & Run editor.",
};

const KEY = "codemind-settings";

export function loadSettings(): AiSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      model:
        typeof parsed.model === "string" && parsed.model.trim()
          ? parsed.model.trim()
          : DEFAULT_SETTINGS.model,
      systemPrompt:
        typeof parsed.systemPrompt === "string"
          ? parsed.systemPrompt
          : DEFAULT_SETTINGS.systemPrompt,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AiSettings) {
  window.localStorage.setItem(KEY, JSON.stringify(settings));
}
