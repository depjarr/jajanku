"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, ChevronLeft, RotateCcw } from "lucide-react";
import { haptic, softSpring, spring } from "@/components/ui/haptic";

type Msg = { id: string; role: "user" | "assistant"; content: string };

// Riwayat disimpan di memori selama tab terbuka (tetap ada saat pindah halaman).
let memory: Msg[] | null = null;
const SUGGESTIONS = [
  "Berapa total jajanku bulan ini?",
  "Aku paling boros di kategori apa?",
  "Cara pakai mode Sekali jepret?",
  "Kasih tips hemat jajan dong",
  "Gimana cara atur budget?",
];

function greeting(name: string): Msg {
  return {
    id: "hello",
    role: "assistant",
    content: `Halo${name ? ` ${name}` : ""}! Aku Jaja, asisten jajanmu.\nAku bisa bantu cara pakai Jajanku, cek pengeluaran jajanmu, atau kasih tips hemat. Mau tanya apa?`,
  };
}

/** Teks bot: dukung **tebal** dan baris baru. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

export function ChatView({ displayName }: { displayName: string }) {
  const [messages, setMessages] = useState<Msg[]>(() => memory ?? [greeting(displayName)]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    memory = messages.slice(-40);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, waiting]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    haptic();
    setInput("");
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content };
    const history = [...messages.filter((m) => m.id !== "hello"), userMsg];
    setMessages((ms) => [...ms, userMsg]);
    setBusy(true);
    setWaiting(true);

    const botId = crypto.randomUUID();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Jaja lagi nggak bisa dihubungi.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let started = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (!started) {
          started = true;
          setWaiting(false);
          setMessages((ms) => [...ms, { id: botId, role: "assistant", content: acc }]);
        } else {
          setMessages((ms) => ms.map((m) => (m.id === botId ? { ...m, content: acc } : m)));
        }
      }
      if (!started) setMessages((ms) => [...ms, { id: botId, role: "assistant", content: "Hmm, aku nggak dapat jawaban. Coba lagi ya." }]);
    } catch (e) {
      setMessages((ms) => [...ms, { id: botId, role: "assistant", content: `${e instanceof Error ? e.message : "Terjadi kesalahan."}` }]);
    } finally {
      setBusy(false);
      setWaiting(false);
      inputRef.current?.focus();
    }
  }

  const reset = () => {
    haptic();
    setMessages([greeting(displayName)]);
  };

  const onlyGreeting = messages.length === 1;

  return (
    <main className="mx-auto -mb-36 flex h-[calc(100dvh-max(env(safe-area-inset-top),12px))] max-w-2xl flex-col md:-mb-12 md:h-[calc(100dvh-4rem)]">
      {/* Header */}
      <header className="glass sticky top-0 z-20 -mx-4 flex items-center gap-3 border-b border-ink/5 px-4 py-2.5 md:mx-0 md:rounded-2xl md:border-0 md:shadow-sm md:ring-1 md:ring-ink/5">
        <Link href="/" aria-label="Kembali" className="press -ml-1 grid size-9 place-items-center rounded-full md:hidden">
          <ChevronLeft className="size-6" />
        </Link>
        <span className="relative grid size-10 place-items-center rounded-full bg-primary text-primary-ink" aria-hidden>
          <span className="text-lg leading-none" aria-hidden>🤖</span>
          <span className="absolute bottom-0 right-0 size-3 rounded-full bg-[#34C759] ring-2 ring-surface" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-bold leading-tight">Jaja</h1>
          <p className="text-xs text-muted">{busy ? "sedang mengetik…" : "Asisten AI Jajanku · online"}</p>
        </div>
        <button type="button" onClick={reset} aria-label="Mulai percakapan baru" className="press grid size-9 place-items-center rounded-full text-muted">
          <RotateCcw className="size-[18px]" />
        </button>
      </header>

      {/* Pesan */}
      <div className="flex-1 space-y-2 overflow-y-auto py-4" aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout="position"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={softSpring}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <p
                className={`max-w-[82%] whitespace-pre-wrap break-words px-4 py-2.5 text-[15px] leading-relaxed ${
                  m.role === "user"
                    ? "rounded-[22px] rounded-br-md bg-strong text-white"
                    : "rounded-[22px] rounded-bl-md bg-ink/[0.06] text-ink"
                }`}
              >
                {m.role === "assistant" ? <Rich text={m.content} /> : m.content}
              </p>
            </motion.div>
          ))}

          {waiting && (
            <motion.div key="typing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
              <span className="flex gap-1 rounded-[22px] rounded-bl-md bg-ink/[0.06] px-4 py-3.5" role="status" aria-label="Jaja sedang mengetik">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="size-2 rounded-full bg-muted"
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {onlyGreeting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s, i) => (
              <motion.button
                key={s}
                type="button"
                onClick={() => send(s)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.35 + i * 0.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-full border border-ink/10 bg-surface px-3.5 py-2 text-sm font-semibold shadow-sm"
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 -mx-4 flex items-end gap-2 bg-bg px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 md:mx-0"
      >
        <label className="flex min-h-11 flex-1 items-center rounded-[22px] bg-ink/[0.05] px-4 ring-1 ring-ink/5 focus-within:ring-2 focus-within:ring-primary">
          <span className="sr-only">Tulis pesan</span>
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Tanya Jaja…"
            className="max-h-32 w-full resize-none bg-transparent py-2.5 text-[16px] outline-none [field-sizing:content]"
          />
        </label>
        <motion.button
          type="submit"
          disabled={!input.trim() || busy}
          whileTap={{ scale: 0.88 }}
          aria-label="Kirim"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-strong text-white transition-opacity disabled:opacity-30"
        >
          <ArrowUp className="size-5" strokeWidth={2.6} />
        </motion.button>
      </form>
    </main>
  );
}
