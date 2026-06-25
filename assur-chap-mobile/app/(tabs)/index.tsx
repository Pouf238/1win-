import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Badge, Body, Card, H1, H2, Muted, ui } from "@/components/ui";
import { useAuth } from "@/providers/auth";
import { getBackend, backendMode } from "@/lib/backend";
import { radius, useColors } from "@/lib/theme";
import { daysUntil, fcfa, initials } from "@/lib/format";
import type { Contract, Notification, Payment, Vehicle } from "@/lib/types";

export default function Dashboard() {
  const c = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const b = getBackend();
        const [ct, vh, pm, nt] = await Promise.all([b.getContracts(), b.getVehicles(), b.getPayments(), b.getNotifications()]);
        if (!active) return;
        setContracts(ct);
        setVehicles(vh);
        setPayments(pm);
        setNotifs(nt);
        setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const active = contracts.filter((x) => x.status === "active");
  const expiring = active.filter((x) => daysUntil(x.endDate) <= 30);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  const kpis = [
    { v: String(active.length), l: "Contrats actifs", icon: "document-text-outline" as const },
    { v: String(vehicles.length), l: "Véhicules", icon: "car-outline" as const },
    { v: String(expiring.length), l: "À renouveler", icon: "time-outline" as const },
    { v: fcfa(totalPaid), l: "Total payé", icon: "wallet-outline" as const, wide: true },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <View style={ui.rowBetween}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar name={user?.name ?? "?"} size={44} />
            <View>
              <H2>Bonjour {user?.name?.split(" ")[0]} 👋</H2>
              <Muted>Aperçu de vos assurances</Muted>
            </View>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/quote")} style={{ padding: 10, borderRadius: radius.pill, backgroundColor: c.accent }}>
            <Ionicons name="flash" size={20} color="#1a1205" />
          </Pressable>
        </View>

        {backendMode() === "demo" && (
          <View style={{ backgroundColor: c.warningBg, borderRadius: radius.sm, padding: 10 }}>
            <Text style={{ color: c.warning, fontSize: 12, fontWeight: "700" }}>Mode démo — données locales (configurez Supabase pour la production)</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={c.brand} style={{ marginTop: 30 }} />
        ) : (
          <>
            {expiring.length > 0 && (
              <Card style={{ backgroundColor: c.warningBg, borderColor: c.warning }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="alert-circle-outline" size={22} color={c.warning} />
                  <Body style={{ flex: 1, fontWeight: "700" }}>{expiring.length} contrat(s) arrivent à échéance.</Body>
                </View>
              </Card>
            )}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {kpis.map((k, i) => (
                <Card key={i} style={{ width: k.wide ? "100%" : "47%" }}>
                  <Ionicons name={k.icon} size={20} color={c.brand} />
                  <Text style={{ color: c.text, fontSize: 22, fontWeight: "800", marginTop: 8 }}>{k.v}</Text>
                  <Muted>{k.l}</Muted>
                </Card>
              ))}
            </View>

            <View style={ui.rowBetween}>
              <H2>Contrats actifs</H2>
              <Pressable onPress={() => router.push("/(tabs)/contracts")}>
                <Text style={{ color: c.brand, fontWeight: "700" }}>Tout voir</Text>
              </Pressable>
            </View>
            {active.length === 0 ? (
              <Card>
                <Muted>Aucun contrat actif.</Muted>
              </Card>
            ) : (
              active.slice(0, 3).map((ct) => {
                const v = vehicles.find((x) => x.id === ct.vehicleId);
                return (
                  <Card key={ct.id}>
                    <View style={ui.rowBetween}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <View style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: "#fff", fontWeight: "800" }}>{initials(ct.insurer)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Body style={{ fontWeight: "700" }}>{ct.insurer}</Body>
                          <Muted>{v ? `${v.brand} ${v.model}` : ct.coverageName}</Muted>
                        </View>
                      </View>
                      <Badge label={daysUntil(ct.endDate) <= 30 ? `${daysUntil(ct.endDate)} j` : "Actif"} tone={daysUntil(ct.endDate) <= 30 ? "warning" : "success"} />
                    </View>
                  </Card>
                );
              })
            )}

            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable onPress={() => router.push("/(tabs)/vehicles")} style={{ flex: 1 }}>
                <Card>
                  <Ionicons name="car-outline" size={22} color={c.brand} />
                  <Body style={{ fontWeight: "700", marginTop: 6 }}>Mes véhicules</Body>
                </Card>
              </Pressable>
              <Pressable onPress={() => router.push("/(tabs)/claims")} style={{ flex: 1 }}>
                <Card>
                  <Ionicons name="warning-outline" size={22} color={c.brand} />
                  <Body style={{ fontWeight: "700", marginTop: 6 }}>Sinistres</Body>
                </Card>
              </Pressable>
            </View>

            <H2>Notifications</H2>
            <Card>
              {notifs.slice(0, 4).map((n, i) => (
                <View key={n.id} style={{ flexDirection: "row", gap: 10, paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border }}>
                  <Ionicons name="notifications-outline" size={18} color={c.brand} />
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: "700", fontSize: 14 }}>{n.title}</Body>
                    <Muted>{n.body}</Muted>
                  </View>
                </View>
              ))}
              {notifs.length === 0 && <Muted>Aucune notification.</Muted>}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
