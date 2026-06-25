import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Badge, Body, Button, Card, H1, Muted, ui } from "@/components/ui";
import { useAuth } from "@/providers/auth";
import { useColors } from "@/lib/theme";

export default function Profile() {
  const c = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function doLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  if (!user) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <H1>Profil</H1>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={user.name} size={56} />
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: "800", fontSize: 17 }}>{user.name}</Body>
              <Muted>{user.email}</Muted>
              <Muted>{user.phone || "—"}</Muted>
            </View>
            <Badge label={user.role} tone="brand" />
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="gift-outline" size={22} color={c.accent600} />
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: "700" }}>Code de parrainage</Body>
              <Muted>Partagez et gagnez du cashback</Muted>
            </View>
          </View>
          <View style={{ marginTop: 12, backgroundColor: c.brand50, borderRadius: 12, borderWidth: 1, borderColor: c.brand, borderStyle: "dashed", padding: 14, alignItems: "center" }}>
            <Text style={{ color: c.brand, fontWeight: "800", fontSize: 22, letterSpacing: 2 }}>{user.referralCode}</Text>
          </View>
        </Card>

        <Card>
          <Body style={{ fontWeight: "700", marginBottom: 6 }}>Préférences</Body>
          <Row icon="notifications-outline" label="Notifications WhatsApp & email" c={c} right={<Badge label="Activées" tone="success" />} />
          <Row icon="shield-checkmark-outline" label="Double authentification (OTP)" c={c} right={<Badge label="À venir" />} />
          <Row icon="moon-outline" label="Thème" c={c} right={<Muted>Auto (système)</Muted>} />
        </Card>

        <Button label="Se déconnecter" variant="danger" onPress={doLogout} />
        <Muted style={{ textAlign: "center" }}>Assur Chap Mobile · v0.1</Muted>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, right, c }: { icon: keyof typeof Ionicons.glyphMap; label: string; right?: ReactNode; c: ReturnType<typeof useColors> }) {
  return (
    <View style={[ui.rowBetween, { paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
        <Ionicons name={icon} size={18} color={c.textSoft} />
        <Text style={{ color: c.text, fontSize: 14, flex: 1 }}>{label}</Text>
      </View>
      {right}
    </View>
  );
}
