import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Body, Button, Card, Field, H1, H2, Muted, ui } from "@/components/ui";
import { getBackend } from "@/lib/backend";
import { radius, useColors } from "@/lib/theme";
import { formatDate } from "@/lib/format";
import type { Claim, Contract } from "@/lib/types";

const TYPES = ["Collision", "Vol", "Incendie", "Bris de glace", "Autre"];

export default function Claims() {
  const c = useColors();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [contractId, setContractId] = useState("");
  const [desc, setDesc] = useState("");
  const [loc, setLoc] = useState("");

  const load = useCallback(async () => {
    const b = getBackend();
    const [cl, ct] = await Promise.all([b.getClaims(), b.getContracts()]);
    setClaims(cl);
    const active = ct.filter((x) => x.status === "active");
    setContracts(active);
    if (active[0]) setContractId((p) => p || active[0].id);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit() {
    if (!contractId || !desc) return;
    setBusy(true);
    try {
      const ct = contracts.find((x) => x.id === contractId);
      await getBackend().addClaim({ contractId, vehicleId: ct?.vehicleId ?? "", type, description: desc, location: loc || "Non précisé" });
      setOpen(false);
      setDesc("");
      setLoc("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <View style={ui.rowBetween}>
          <H1>Sinistres</H1>
          <Pressable onPress={() => setOpen(true)} disabled={contracts.length === 0} style={{ padding: 10, borderRadius: radius.pill, backgroundColor: contracts.length ? c.accent : c.border }}>
            <Ionicons name="add" size={20} color="#1a1205" />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={c.brand} style={{ marginTop: 20 }} />
        ) : claims.length === 0 ? (
          <Card><Muted>Aucun sinistre déclaré. Tant mieux !</Muted></Card>
        ) : (
          claims.map((cl) => (
            <Card key={cl.id}>
              <View style={ui.rowBetween}>
                <Body style={{ fontWeight: "700" }}>{cl.type}</Body>
                <Badge label={cl.status} tone="warning" />
              </View>
              <Muted style={{ marginTop: 4 }}>{cl.description}</Muted>
              <View style={{ marginTop: 10, gap: 8 }}>
                {cl.updates.map((u, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand }} />
                    <Text style={{ color: c.text, fontWeight: "600", fontSize: 13 }}>{u.label}</Text>
                    <Muted>· {formatDate(u.date)}</Muted>
                  </View>
                ))}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12, maxHeight: "90%" }}>
            <View style={ui.rowBetween}>
              <H2>Déclarer un sinistre</H2>
              <Pressable onPress={() => setOpen(false)}><Ionicons name="close" size={24} color={c.textSoft} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
              <Text style={{ color: c.textSoft, fontWeight: "600", fontSize: 13 }}>Type</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {TYPES.map((t) => (
                  <Pressable key={t} onPress={() => setType(t)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: type === t ? c.brand : c.bgAlt }}>
                    <Text style={{ color: type === t ? "#fff" : c.text, fontWeight: "600", fontSize: 13 }}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Description" value={desc} onChangeText={setDesc} placeholder="Décrivez l'accident…" multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: "top" }} />
              <Field label="Lieu" value={loc} onChangeText={setLoc} placeholder="Boulevard VGE, Abidjan" />
              <Button label="Envoyer le dossier" onPress={submit} loading={busy} style={{ marginTop: 6 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
