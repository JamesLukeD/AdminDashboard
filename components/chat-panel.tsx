"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Send,
  Bot,
  User,
  Loader2,
  MessageSquare,
  Trash2,
  X,
  ChevronRight,
  Pin,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

// Map dashboard routes to the API calls we'll make to get page context
function getPageLabel(pathname: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard Overview",
    "/dashboard/traffic": "Traffic Analytics",
    "/dashboard/products": "Products",
    "/dashboard/geo": "Geographic",
    "/dashboard/seo": "SEO Performance",
    "/dashboard/seo/rank-tracker": "Rank Tracker",
    "/dashboard/opportunities": "Opportunities",
    "/dashboard/crawl": "Site Crawl",
    "/dashboard/competitors": "Competitors",
    "/dashboard/competitors/keyword-gap": "Keyword Gap",
    "/dashboard/competitors/page-analyser": "Page Analyser",
    "/dashboard/competitors/serp-scout": "SERP Scout",
    "/dashboard/competitors/tech-stack": "Tech Stack",
    "/dashboard/competitors/live": "Live Competitor Intel",
    "/dashboard/report": "Report",
    "/dashboard/chat": "Chat",
  };
  return map[pathname] ?? pathname.replace("/dashboard/", "").replace(/\//g, " › ");
}

export function ChatPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionPage, setSessionPage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinnedTs, setPinnedTs] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Strip markdown formatting so TTS reads clean prose
  function stripMarkdown(text: string): string {
    return text
      .replace(/#{1,6}\s+/g, "")           // headings
      .replace(/\*\*(.+?)\*\*/g, "$1")     // bold
      .replace(/\*(.+?)\*/g, "$1")         // italic
      .replace(/__(.+?)__/g, "$1")         // bold underscore
      .replace(/_(.+?)_/g, "$1")           // italic underscore
      .replace(/`{1,3}[^`]*`{1,3}/g, "")  // inline code / code blocks
      .replace(/^\s*[-*+]\s+/gm, "")       // bullet points
      .replace(/^\s*\d+\.\s+/gm, "")       // numbered lists
      .replace(/^[-–—]{2,}\s*$/gm, "")     // horizontal rules
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → just label
      .replace(/\n{2,}/g, ". ")            // paragraph breaks → pause
      .replace(/\n/g, " ")                 // single newlines
      .replace(/\s{2,}/g, " ")             // collapse spaces
      .trim();
  }

  // Pick the best available voice: prefer natural/neural English voices
  function getBestVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const priority = [
      "Google UK English Female",
      "Google UK English Male",
      "Microsoft Sonia Online (Natural) - English (United Kingdom)",
      "Microsoft Ryan Online (Natural) - English (United Kingdom)",
      "Microsoft Aria Online (Natural) - English (United States)",
      "Microsoft Guy Online (Natural) - English (United States)",
      "Google US English",
    ];
    for (const name of priority) {
      const match = voices.find((v) => v.name === name);
      if (match) return match;
    }
    // Fallback: any English voice that sounds online/neural
    const online = voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("online"));
    if (online) return online;
    // Last resort: any English voice
    return voices.find((v) => v.lang.startsWith("en")) ?? null;
  }

  // Speak the latest assistant message whenever it arrives (if TTS is on)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ttsEnabled) {
      window.speechSynthesis?.cancel();
      return;
    }
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant") return;
    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(stripMarkdown(last.text));
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      const voice = getBestVoice();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };
    // Voices may not be loaded yet on first run
    if (window.speechSynthesis.getVoices().length) {
      speak();
    } else {
      window.speechSynthesis.onvoiceschanged = speak;
    }
  }, [messages, ttsEnabled]);

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function logAsTask(msg: Message) {
    // Strip code blocks and meta-commentary ("To log these...", "Here are the N tasks...")
    const cleaned = msg.text
      .replace(/```[\s\S]*?```/g, "")           // remove code fences
      .replace(/^(to log these|here are the \d+|use the|tell me the file).*/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const lines = cleaned.split("\n").filter(Boolean);
    // Prefer the first bold/heading line as title (e.g. **Do X** or ## Do X)
    const boldLine = lines.find((l) => /^[#*]{1,3}\s*.{10,}/.test(l));
    const rawTitle = (boldLine ?? lines[0]).replace(/^[#*\-•]+\s*/, "").replace(/\*+/g, "").trim();
    const title = rawTitle.slice(0, 80);
    // Use cleaned text for description, up to 1500 chars
    const description = cleaned.slice(0, 1500);
    const lower = msg.text.toLowerCase();
    const priority = lower.includes("urgent") || lower.includes("critical") || lower.includes("drop") || lower.includes("high priority")
      ? "High" : lower.includes("low priority") ? "Low" : "Medium";
    await fetch("/api/ai-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority, source: "OpenClaw" }),
    });
    setPinnedTs(msg.ts);
    setTimeout(() => setPinnedTs(null), 2000);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text, ts: Date.now() }]);
    setLoading(true);

    // On a new session, tell the server which page we're on so it can fetch the right context
    const isNewSession = !sessionId;
    if (isNewSession) setSessionPage(pathname);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId,
          ...(isNewSession && { currentPage: pathname }),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Agent failed to respond.");
      } else {
        if (data.sessionId) setSessionId(data.sessionId);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.text, ts: Date.now() },
        ]);
      }
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, pathname]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearChat() {
    setMessages([]);
    setSessionId(null);
    setSessionPage(null);
    setError(null);
  }

  const pageLabel = getPageLabel(pathname);
  const sessionLabel = sessionPage ? getPageLabel(sessionPage) : null;

  const suggestions: Record<string, string[]> = {
    "/dashboard": ["What should I focus on today?", "Summarise this week's performance", "What's my biggest SEO win right now?", "What's declining that needs attention?"],
    "/dashboard/traffic": ["What's driving traffic growth?", "Which channels are underperforming?", "Which pages are losing visitors?"],
    "/dashboard/seo": ["What keywords am I close to ranking for?", "Where am I losing impressions?", "What quick wins can I action this week?"],
    "/dashboard/seo/rank-tracker": ["Which keywords have dropped recently?", "What's my best ranking keyword?", "Which tracked keywords need urgent attention?"],
    "/dashboard/competitors": ["How do I compare to Hadley?", "Who's my biggest organic threat?", "Where am I being outranked?"],
    "/dashboard/competitors/live": ["Who has the most organic traffic?", "What keywords are competitors ranking for that I'm not?", "Which competitor is growing fastest?"],
    "/dashboard/competitors/keyword-gap": ["What keywords should I target next?", "Which gaps are easiest to close?"],
    "/dashboard/opportunities": ["What's my biggest quick win?", "Which opportunities have the most traffic potential?"],
  };
  const pageSuggestions = suggestions[pathname] ?? ["What should I focus on today?", "What can you tell me about this page?"];

  return (
    <>
      {/* Toggle button — fixed to right edge */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center justify-center gap-1 px-1.5 py-4 rounded-l-xl transition-all shadow-lg"
        style={{
          background: open ? "#0d1f2d" : "linear-gradient(135deg, #00ff88, #00cc77)",
          border: "1px solid #1e2d3d",
          borderRight: "none",
          color: open ? "#00ff88" : "#060a0f",
        }}
        title="Toggle AI Chat"
      >
        {open ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <>
            <Bot className="w-4 h-4" />
            <span style={{ writingMode: "vertical-rl", fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}>AI</span>
          </>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "transparent" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-screen z-50 flex flex-col transition-transform duration-300"
        style={{
          width: "380px",
          background: "#060a0f",
          borderLeft: "1px solid #1e2d3d",
          transform: open ? "translateX(0)" : "translateX(100%)",
          boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.5)" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid #1e2d3d" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #00ff88, #00cc77)" }}
            >
              <Bot className="w-4 h-4" style={{ color: "#060a0f" }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">Cawarden AI</p>
              <p className="text-xs leading-tight" style={{ color: "#4a90b8" }}>
                {sessionLabel ? (
                  <span>Context: <span className="text-white">{sessionLabel}</span></span>
                ) : (
                  <span>On: <span className="text-white">{pageLabel}</span></span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTtsEnabled((v) => !v)}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: ttsEnabled ? "#00ff88" : "#4a90b8" }}
              title={ttsEnabled ? "Mute read-aloud" : "Enable read-aloud"}
            >
              {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: "#4a90b8" }}
                title="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: "#4a90b8" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-8">
              <MessageSquare className="w-10 h-10" style={{ color: "#1e2d3d" }} />
              <div>
                <p className="text-white text-sm font-medium">Your SEO analyst is ready</p>
                <p className="text-xs mt-1" style={{ color: "#4a90b8" }}>
                  Live data from GA4, Search Console &amp; Rank Tracker loaded on first message
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-1">
                {pageSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left px-3 py-2 rounded-lg text-xs transition-colors w-full"
                    style={{ background: "#0d1f2d", border: "1px solid #1e2d3d", color: "#a0c4d8" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.ts}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background:
                    msg.role === "user"
                      ? "#1e2d3d"
                      : "linear-gradient(135deg, #00ff88, #00cc77)",
                }}
              >
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Bot className="w-3.5 h-3.5" style={{ color: "#060a0f" }} />
                )}
              </div>
              <div className="flex flex-col gap-1 max-w-[85%]">
                <div
                  className="px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: msg.role === "user" ? "#1e2d3d" : "#0d1f2d",
                    border: "1px solid #1e2d3d",
                    color: msg.role === "user" ? "#e0f0ff" : "#a0c4d8",
                  }}
                >
                  {msg.text}
                </div>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => logAsTask(msg)}
                    className="self-start flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all"
                    style={{
                      color: pinnedTs === msg.ts ? "#00ff88" : "#2a4a5a",
                      background: "transparent",
                    }}
                    title="Log this as a task for Copilot to implement"
                  >
                    {pinnedTs === msg.ts ? (
                      <><Check className="w-3 h-3" /> Logged!</>
                    ) : (
                      <><Pin className="w-3 h-3" /> Log as task</>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #00ff88, #00cc77)" }}
              >
                <Bot className="w-3.5 h-3.5" style={{ color: "#060a0f" }} />
              </div>
              <div
                className="px-3 py-2 rounded-xl flex items-center gap-2"
                style={{ background: "#0d1f2d", border: "1px solid #1e2d3d" }}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#00ff88" }} />
                <span className="text-xs" style={{ color: "#4a90b8" }}>Thinking…</span>
              </div>
            </div>
          )}

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{ background: "#1a0a0a", border: "1px solid #ff4444", color: "#ff8888" }}
            >
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 shrink-0" style={{ borderTop: "1px solid #1e2d3d" }}>
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{ background: "#0d1f2d", border: "1px solid #1e2d3d" }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Ask about ${pageLabel}…`}
              rows={1}
              className="flex-1 bg-transparent text-xs resize-none outline-none leading-relaxed"
              style={{ color: "#e0f0ff", maxHeight: "100px" }}
            />
            <button
              onClick={toggleMic}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
              style={{
                background: listening ? "linear-gradient(135deg, #ff4466, #cc2244)" : "#1e2d3d",
                border: listening ? "none" : "1px solid #2a3d4d",
              }}
              title={listening ? "Stop listening" : "Speak your question"}
            >
              {listening ? (
                <MicOff className="w-3.5 h-3.5" style={{ color: "#fff" }} />
              ) : (
                <Mic className="w-3.5 h-3.5" style={{ color: "#4a90b8" }} />
              )}
            </button>
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #00ff88, #00cc77)" }}
            >
              <Send className="w-3.5 h-3.5" style={{ color: "#060a0f" }} />
            </button>
          </div>
          <p className="text-xs mt-1.5 text-center" style={{ color: "#1e3a4a" }}>
            {listening ? (
              <span style={{ color: "#ff4466" }}>Listening… speak now</span>
            ) : (
              <>Enter to send · Shift+Enter new line</>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
