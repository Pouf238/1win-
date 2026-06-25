"use client";
// ==========================================================================
// Assur Chap — Assistant IA (chat 24/7)
// ==========================================================================
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { useI18n } from "@/i18n/LanguageProvider";
import { getBackend } from "@/lib/backend";
import type { ChatMessage } from "@/lib/backend/types";

export default function AssistantPage() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const en = lang === "en";
  const logRef = useRef<HTMLDivElement>(null);

  const welcome = en
    ? "Hi 👋 I'm your Assur Chap assistant. Ask me about plans, coverage, pricing, or how to file a claim."
    : "Bonjour 👋 Je suis votre assistant Assur Chap. Posez vos questions sur les formules, garanties, tarifs ou la déclaration d'un sinistre.";

  const suggestions = en
    ? ["Which plan for an old car?", "How do I file a claim?", "What does Comprehensive cover?", "How is the price calculated?"]
    : ["Quelle formule pour une voiture ancienne ?", "Comment déclarer un sinistre ?", "Que couvre le Tous Risques ?", "Comment est calculé le prix ?"];

  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: welcome }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await getBackend().chat(next, lang);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      if (res.simulated) toast(en ? "Demo mode — configure OpenAI for full answers" : "Mode démo — configurez OpenAI pour des réponses complètes", "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur", "err");
      setMessages((m) => [...m, { role: "assistant", content: en ? "Sorry, I couldn't answer right now." : "Désolé, je n'ai pas pu répondre pour le moment." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="stack" style={{ "--gap": "14px" } as React.CSSProperties}>
      <div className="hello" style={{ marginBottom: 4 }}>
        <div className="row gap-sm">
          <span className="icon-tile accent">
            <Icon.sparkle size={22} />
          </span>
          <div>
            <h2 style={{ fontSize: "1.3rem" }}>{en ? "AI Assistant" : "Assistant IA"}</h2>
            <p className="soft" style={{ fontSize: ".9rem" }}>
              {en ? "Available 24/7 · FR & EN" : "Disponible 24h/24 · FR & EN"}
            </p>
          </div>
        </div>
      </div>

      <div className="card chat">
        <div className="chat-log" ref={logRef}>
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "me" : "bot"}`}>
              {m.content}
            </div>
          ))}
          {sending && (
            <div className="msg bot soft">
              <span className="spin" style={{ verticalAlign: "-3px" }}>
                <Icon.refresh size={15} />
              </span>{" "}
              {en ? "Thinking…" : "Réflexion…"}
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="chat-suggest">
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)} disabled={sending}>
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={en ? "Type your question…" : "Posez votre question…"}
            disabled={sending}
          />
          <button className="btn btn-primary btn-icon" type="submit" disabled={sending || !input.trim()} aria-label={en ? "Send" : "Envoyer"}>
            <Icon.arrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
