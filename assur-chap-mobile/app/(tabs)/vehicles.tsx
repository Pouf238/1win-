import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Body, Button, Card, Field, H1, H2, Muted, ui } from "@/components/ui";
import { getBackend } from "@/lib/backend";
import { radius, useColors } from "@/lib/theme";
import { fcfa } from "@/lib/format";
import type { Usage, Vehicle } from "@/lib/types";

const EMPTY = { brand: "", model: "", year: String(new Date().getFullYear()), plate: "", vin: "", power: "7", fuel: "Essence", value: "5000000", usage: "personnel" as Usage };

export default function Vehicles() {
  const c = useColors();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY, v: string) => setF((p) => ({ ...p, [k]: v }));

  const load = useCallback(async () => {
    setVehicles(await getBackend().getVehicles());
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    if (!f.brand || !f.model || !f.plate) return;
    setBusy(true);
    try {
      await getBackend().addVehicle({ brand: f.brand, model: f.model, year: +f.year || 2020, plate: f.plate, vin: f.vin, power: +f.power || 7, fuel: f.fuel, value: +f.value || 0, usage: f.usage });
      setOpen(false);
      setF(EMPTY);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <View style={ui.rowBetween}>
          <H1>Mes véhicules</H1>
          <Pressable onPress={() => setOpen(true)} style={{ padding: 10, borderRadius: radius.pill, backgroundColor: c.accent }}>
            <Ionicons name="add" size={20} color="#1a1205" />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={c.brand} style={{ marginTop: 20 }} />
        ) : vehicles.length === 0 ? (
          <Card><Muted>Aucun véhicule enregistré.</Muted></Card>
        ) : (
          vehicles.map((v) => (
            <Card key={v.id}>
              <View style={ui.rowBetween}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: c.brand50, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="car-sport-outline" size={24} color={c.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: "700" }}>{v.brand} {v.model}</Body>
                    <Muted>{v.plate} · {v.power} CV · {fcfa(v.value)}</Muted>
                  </View>
                </View>
                <Badge label={String(v.year)} />
              </View>
              <Button label="Obtenir un devis" variant="soft" style={{ marginTop: 12 }} onPress={() => router.push(`/(tabs)/quote?vehicle=${v.id}`)} />
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12, maxHeight: "90%" }}>
            <View style={ui.rowBetween}>
              <H2>Ajouter un véhicule</H2>
              <Pressable onPress={() => setOpen(false)}><Ionicons name="close" size={24} color={c.textSoft} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 10 }}>
              <Field label="Marque" value={f.brand} onChangeText={(t) => set("brand", t)} placeholder="Toyota" />
              <Field label="Modèle" value={f.model} onChangeText={(t) => set("model", t)} placeholder="Corolla" />
              <Field label="Année" value={f.year} onChangeText={(t) => set("year", t)} keyboardType="number-pad" />
              <Field label="Immatriculation" value={f.plate} onChangeText={(t) => set("plate", t)} placeholder="AB-1234-CI" autoCapitalize="characters" />
              <Field label="Puissance fiscale (CV)" value={f.power} onChangeText={(t) => set("power", t)} keyboardType="number-pad" />
              <Field label="Valeur (FCFA)" value={f.value} onChangeText={(t) => set("value", t)} keyboardType="number-pad" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["personnel", "professionnel"] as Usage[]).map((u) => (
                  <Pressable key={u} onPress={() => set("usage", u)} style={{ flex: 1, padding: 12, borderRadius: radius.sm, borderWidth: 2, borderColor: f.usage === u ? c.brand : c.border, backgroundColor: f.usage === u ? c.brand50 : c.surface }}>
                    <Text style={{ textAlign: "center", color: c.text, fontWeight: "600", textTransform: "capitalize" }}>{u}</Text>
                  </Pressable>
                ))}
              </View>
              <Button label="Enregistrer" onPress={save} loading={busy} style={{ marginTop: 6 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
