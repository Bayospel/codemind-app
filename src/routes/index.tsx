import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { loadSettings } from "@/lib/settings";
import logo from "@/assets/logo.png";

const CHAT_KEY = "codemind-chat";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chat — CODE MIND" },
      {
        name: "description",
        content:
          "Ask CODE MIND anything about code. Get clear answers, examples, and runnable snippets.",
      },
      { property: "og:title", content: "Chat — CODE MIND" },
      {
        property: "og:description",
        content:
          "Ask CODE MIND anything about code. Get clear answers, examples, and runnable snippets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null,
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_KEY);
      setInitialMessages(raw ? (JSON.parse(raw) as UIMessage[]) : []);
    } catch {
      setInitialMessages([]);
    }
  }, []);

  if (initialMessages === null) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Shimmer className="font-mono text-sm">Loading chat…</Shimmer>
      </div>
    );
  }
  return <ChatSession initialMessages={initialMessages} />;
}

function ChatSession({ initialMessages }: { initialMessages: UIMessage[] }) {
  const [session, setSession] = useState(0);
  return <ChatWindow key={session} initialMessages={initialMessages} onReset={() => setSession((s) => s + 1)} />;
}

function ChatWindow({
  initialMessages,
  onReset,
}: {
  initialMessages: UIMessage[];
  onReset: () => void;
}) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: "codemind-main",
    messages: initialMessages,
    transport,
    onFinish: ({ messages: finished }) => {
      try {
        window.localStorage.setItem(CHAT_KEY, JSON.stringify(finished));
      } catch {
        // storage full or unavailable — chat still works
      }
    },
    onError: (err) => console.error("chat error", err),
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!isLoading) textareaRef.current?.focus();
  }, [isLoading]);

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text || isLoading) return;
    void sendMessage({ text }, { body: { settings: loadSettings() } });
  };

  const clearChat = () => {
    window.localStorage.removeItem(CHAT_KEY);
    setMessages([]);
    onReset();
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <p className="font-mono text-xs text-muted-foreground">
          // ask anything about code
        </p>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" />
            New conversation
          </button>
        )}
      </div>

      <Conversation className="flex-1">
        <ConversationContent className="gap-6 px-4">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <img
                src={logo}
                alt="CODE MIND"
                width={96}
                height={96}
                className="h-24 w-24"
              />
              <h1 className="mt-4 font-mono text-xl font-bold tracking-widest text-foreground">
                CODE<span className="text-primary">MIND</span>
              </h1>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Your AI coding companion. Ask a question, debug an error, or
                request a snippet — then try it in Build &amp; Run.
              </p>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => {
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");
              if (!text) return null;
              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.role === "assistant" ? (
                      <MessageResponse>{text}</MessageResponse>
                    ) : (
                      <div className="rounded-lg bg-secondary px-3 py-2 text-sm whitespace-pre-wrap text-secondary-foreground">
                        {text}
                      </div>
                    )}
                  </MessageContent>
                </Message>
              );
            })
          )}
          {status === "submitted" && (
            <Shimmer className="px-4 font-mono text-sm">Thinking…</Shimmer>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {error && (
        <p className="mx-4 mb-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
          {error.message || "Something went wrong. Please try again."}
        </p>
      )}

      <div className="px-4 pb-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={textareaRef}
            placeholder="Ask CODE MIND a coding question…"
            autoFocus
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={isLoading} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
