import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, Field, H1, Muted } from "@/components/ui";
import { useAuth } from "@/providers/auth";
import { useColors } from "@/lib/theme";

export default function Login() {
  const c = useColors();
  const router = useRouter();
  const { login, loginDemo } = useAuth();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    const r = await login(id.trim(), pw);
    setBusy(false);
    if (r.error) return setError(r.error);
    router.replace("/(tabs)");
  }
  async function demo() {
    setBusy(true);
    const r = await loginDemo();
    setBusy(false);
    if (r.error) return setError(r.error);
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 18, flexGrow: 1, justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="shield-checkmark" color="#fff" size={24} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: c.text }}>
              Assur<Text style={{ color: c.accent }}>Chap</Text>
            </Text>
          </View>

          <H1>Bon retour 👋</H1>
          <Muted>Connectez-vous pour gérer vos assurances.</Muted>

          <Field label="Email ou téléphone" value={id} onChangeText={setId} autoCapitalize="none" keyboardType="email-address" placeholder="demo@assurchap.com" />
          <Field label="Mot de passe" value={pw} onChangeText={setPw} secureTextEntry placeholder="••••••" />
          {error ? <Body style={{ color: c.danger, fontSize: 13 }}>{error}</Body> : null}

          <Button label="Se connecter" onPress={submit} loading={busy} />
          <Button label="✨ Essayer le compte démo" variant="soft" onPress={demo} disabled={busy} />

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 }}>
            <Muted>Pas encore de compte ?</Muted>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={{ color: c.brand, fontWeight: "700" }}>Créer un compte</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
