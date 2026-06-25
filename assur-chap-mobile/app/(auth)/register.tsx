import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, Field, H1, Muted } from "@/components/ui";
import { useAuth } from "@/providers/auth";
import { useColors } from "@/lib/theme";

export default function Register() {
  const c = useColors();
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    if (!name || !email) return setError("Nom et email requis.");
    setBusy(true);
    const r = await register({ name, email, phone, password: pw });
    setBusy(false);
    if (r.error) return setError(r.error);
    if (r.info && !r.user) {
      setError(r.info);
      return;
    }
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 16, flexGrow: 1, justifyContent: "center" }}>
          <H1>Créer un compte</H1>
          <Muted>Quelques secondes pour rejoindre Assur Chap.</Muted>

          <Field label="Nom complet" value={name} onChangeText={setName} placeholder="Awa Traoré" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="vous@email.com" />
          <Field label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+225 07 00 00 00" />
          <Field label="Mot de passe" value={pw} onChangeText={setPw} secureTextEntry placeholder="••••••" />
          {error ? <Body style={{ color: c.danger, fontSize: 13 }}>{error}</Body> : null}

          <Button label="Créer mon compte" onPress={submit} loading={busy} />

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 4 }}>
            <Muted>Déjà un compte ?</Muted>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={{ color: c.brand, fontWeight: "700" }}>Se connecter</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
