import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/lib/theme";
import { getBackend } from "@/lib/backend";
import type { ChatMessage } from "@/lib/types";

const SUGGEST = ["Quelle formule pour une voiture ancienne ?", "Comment déclarer un sinistre ?", "Que couvre le Tous Risques ?"];

export default function Assistant() {
  const c = useColors();
  const scroller = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Bonjour 👋 Je suis votre assistant Assur Chap. Posez vos questions sur les formules, garanties, tarifs ou la déclaration d'un sinistre." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setSending(true);
    setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    try {
      const res = await getBackend().chat(next, "fr");
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Désolé, je n'ai pas pu répondre." }]);
    } finally {
      setSending(false);
      setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accent50, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="sparkles" size={20} color={c.accent600} />
          </View>
          <View>
            <Text style={{ color: c.text, fontWeight: "800", fontSize: 18 }}>Assistant IA</Text>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>Disponible 24h/24</Text>
          </View>
        </View>

        <ScrollView ref={scroller} contentContainerStyle={{ padding: 16, gap: 10 }} style={{ flex: 1 }}>
          {messages.map((m, i) => (
            <View
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: m.role === "user" ? c.brand : c.surface,
                borderColor: c.border,
                borderWidth: m.role === "user" ? 0 : 1,
                borderRadius: 16,
                paddingVertical: 10,
                paddingHorizontal: 14,
                maxWidth: "82%",
              }}
            >
              <Text style={{ color: m.role === "user" ? "#fff" : c.text, fontSize: 15, lineHeight: 21 }}>{m.content}</Text>
            </View>
          ))}
          {sending && <Text style={{ color: c.textMuted, fontStyle: "italic" }}>Réflexion…</Text>}
          {messages.length <= 1 && (
            <View style={{ gap: 8, marginTop: 8 }}>
              {SUGGEST.map((s) => (
                <Pressable key={s} onPress={() => send(s)} style={{ borderWidth: 1, borderColor: c.borderStrong, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, alignSelf: "flex-start" }}>
                  <Text style={{ color: c.text, fontSize: 13 }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={{ flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: c.border, alignItems: "center" }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Posez votre question…"
            placeholderTextColor={c.textMuted}
            style={{ flex: 1, backgroundColor: c.surface, color: c.text, borderColor: c.borderStrong, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}
            onSubmitEditing={() => send(input)}
          />
          <Pressable onPress={() => send(input)} disabled={sending || !input.trim()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.brand, alignItems: "center", justifyContent: "center", opacity: !input.trim() ? 0.5 : 1 }}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
