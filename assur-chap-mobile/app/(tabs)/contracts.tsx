import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Body, Card, H1, Muted, ui } from "@/components/ui";
import { getBackend } from "@/lib/backend";
import { useColors } from "@/lib/theme";
import { daysUntil, fcfa, formatDate, initials } from "@/lib/format";
import type { Contract, Vehicle } from "@/lib/types";

export default function Contracts() {
  const c = useColors();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const b = getBackend();
        const [ct, vh] = await Promise.all([b.getContracts(), b.getVehicles()]);
        if (!active) return;
        setContracts(ct);
        setVehicles(vh);
        setLoading(false);
      })();
      return () => { active = false; };
    }, [])
  );

  function tone(ct: Contract): "success" | "warning" | "danger" {
    if (ct.status !== "active") return "danger";
    return daysUntil(ct.endDate) <= 30 ? "warning" : "success";
  }
  function statusLabel(ct: Contract): string {
    if (ct.status === "expired") return "Expiré";
    if (ct.status === "cancelled") return "Résilié";
    return daysUntil(ct.endDate) <= 30 ? `${daysUntil(ct.endDate)} j` : "Actif";
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <H1>Mes contrats</H1>
        {loading ? (
          <ActivityIndicator color={c.brand} style={{ marginTop: 20 }} />
        ) : contracts.length === 0 ? (
          <Card><Muted>Aucun contrat pour le moment.</Muted></Card>
        ) : (
          contracts.map((ct) => {
            const v = vehicles.find((x) => x.id === ct.vehicleId);
            return (
              <Card key={ct.id}>
                <View style={ui.rowBetween}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontWeight: "800" }}>{initials(ct.insurer)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: "700" }}>{ct.insurer}</Body>
                      <Muted>{v ? `${v.brand} ${v.model} · ${v.plate}` : ct.coverageName}</Muted>
                    </View>
                  </View>
                  <Badge label={statusLabel(ct)} tone={tone(ct)} />
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                  <Field2 k="Formule" v={ct.coverageName} c={c} />
                  <Field2 k="Échéance" v={formatDate(ct.endDate)} c={c} />
                  <Field2 k="Prime" v={fcfa(ct.price)} c={c} />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field2({ k, v, c }: { k: string; v: string; c: ReturnType<typeof useColors> }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.textMuted, fontSize: 11 }}>{k}</Text>
      <Text style={{ color: c.text, fontWeight: "700", fontSize: 13 }}>{v}</Text>
    </View>
  );
}
