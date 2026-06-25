import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Body, Button, Card, H1, H2, Muted, ui } from "@/components/ui";
import { getBackend } from "@/lib/backend";
import { COVERAGES, DURATIONS, computeQuotes, sortOffers, type SortMode } from "@/lib/pricing";
import { radius, useColors } from "@/lib/theme";
import { fcfa, initials } from "@/lib/format";
import type { CoverageId, Contract, Offer, Vehicle } from "@/lib/types";

const PAY = [
  { id: "orange", label: "Orange Money" },
  { id: "mtn", label: "MTN Money" },
  { id: "wave", label: "Wave" },
  { id: "visa", label: "Visa" },
];

export default function Quote() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ vehicle?: string }>();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [step, setStep] = useState(0);
  const [vehicleId, setVehicleId] = useState("");
  const [coverage, setCoverage] = useState<CoverageId>("tiers_plus");
  const [months, setMonths] = useState(12);
  const [sort, setSort] = useState<SortMode>("ai");
  const [chosen, setChosen] = useState<Offer | null>(null);
  const [method, setMethod] = useState("orange");
  const [paying, setPaying] = useState(false);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const vs = await getBackend().getVehicles();
      setVehicles(vs);
      if (params.vehicle && vs.some((v) => v.id === params.vehicle)) {
        setVehicleId(params.vehicle);
        setStep(1);
      } else if (vs[0]) setVehicleId(vs[0].id);
      setLoading(false);
    })();
  }, [params.vehicle]);

  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const offers = useMemo(() => (vehicle ? sortOffers(computeQuotes(vehicle, coverage, months), sort) : []), [vehicle, coverage, months, sort]);
  const recoId = useMemo(() => (vehicle ? sortOffers(computeQuotes(vehicle, coverage, months), "ai")[0]?.insurerId : ""), [vehicle, coverage, months]);

  async function pay() {
    if (!chosen || !vehicle) return;
    setPaying(true);
    try {
      const ct = await getBackend().createContract(chosen, vehicle.id, method);
      if (ct) {
        setContract(ct);
        setStep(4);
      }
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <Center c={c} />;

  if (vehicles.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <View style={{ padding: 18, gap: 12 }}>
          <H1>Obtenir un devis</H1>
          <Card><Muted>Ajoutez d&apos;abord un véhicule.</Muted></Card>
          <Button label="Ajouter un véhicule" onPress={() => router.push("/(tabs)/vehicles")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <H1>Obtenir un devis</H1>
        <Steps step={step} c={c} />

        {step === 0 && (
          <>
            <H2>Quel véhicule ?</H2>
            {vehicles.map((v) => (
              <Pressable key={v.id} onPress={() => setVehicleId(v.id)}>
                <Card style={{ borderColor: vehicleId === v.id ? c.brand : c.border, borderWidth: 2 }}>
                  <Body style={{ fontWeight: "700" }}>{v.brand} {v.model}</Body>
                  <Muted>{v.plate} · {v.year}</Muted>
                </Card>
              </Pressable>
            ))}
            <Button label="Continuer" onPress={() => setStep(1)} />
          </>
        )}

        {step === 1 && (
          <>
            <H2>Formule</H2>
            {(Object.keys(COVERAGES) as CoverageId[]).map((id) => {
              const cov = COVERAGES[id];
              return (
                <Pressable key={id} onPress={() => setCoverage(id)}>
                  <Card style={{ borderColor: coverage === id ? c.brand : c.border, borderWidth: 2 }}>
                    <View style={ui.rowBetween}>
                      <Body style={{ fontWeight: "700" }}>{cov.short}</Body>
                      {coverage === id && <Ionicons name="checkmark-circle" size={20} color={c.brand} />}
                    </View>
                    <Muted>{cov.name}</Muted>
                  </Card>
                </Pressable>
              );
            })}
            <H2>Durée</H2>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {DURATIONS.map((d) => (
                <Pressable key={d.months} onPress={() => setMonths(d.months)} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: months === d.months ? c.brand : c.bgAlt }}>
                  <Text style={{ color: months === d.months ? "#fff" : c.text, fontWeight: "600" }}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Retour" variant="ghost" style={{ flex: 1 }} onPress={() => setStep(0)} />
              <Button label="Comparer" style={{ flex: 1 }} onPress={() => setStep(2)} />
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {([["ai", "Reco IA"], ["cheapest", "Moins cher"], ["coverage", "Couverture"]] as [SortMode, string][]).map(([m, l]) => (
                <Pressable key={m} onPress={() => setSort(m)} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: sort === m ? c.brand : c.borderStrong, backgroundColor: sort === m ? c.brand : c.surface }}>
                  <Text style={{ color: sort === m ? "#fff" : c.text, fontWeight: "600", fontSize: 13 }}>{l}</Text>
                </Pressable>
              ))}
            </View>
            {offers.map((o) => (
              <Card key={o.insurerId} style={{ borderColor: o.insurerId === recoId ? c.accent : c.border }}>
                <View style={ui.rowBetween}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: o.accent, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontWeight: "800" }}>{initials(o.insurer)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: "700" }}>{o.insurer}</Body>
                      <Muted>★ {o.rating} · Franchise {fcfa(o.franchise)}</Muted>
                    </View>
                  </View>
                  {o.insurerId === recoId && <Badge label="Reco IA" tone="accent" />}
                </View>
                <View style={[ui.rowBetween, { marginTop: 10 }]}>
                  <Text style={{ color: c.brand, fontSize: 20, fontWeight: "800" }}>{fcfa(o.price)}</Text>
                  <Button label="Choisir" onPress={() => { setChosen(o); setStep(3); }} />
                </View>
              </Card>
            ))}
            <Button label="Retour" variant="ghost" onPress={() => setStep(1)} />
          </>
        )}

        {step === 3 && chosen && (
          <>
            <H2>Paiement</H2>
            <Card style={{ backgroundColor: c.surface2 }}>
              <View style={ui.rowBetween}>
                <Body>{chosen.insurer} · {chosen.coverageShort}</Body>
                <Text style={{ fontWeight: "800", color: c.text }}>{fcfa(chosen.price)}</Text>
              </View>
            </Card>
            <H2>Moyen de paiement</H2>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {PAY.map((p) => (
                <Pressable key={p.id} onPress={() => setMethod(p.id)} style={{ width: "47%", padding: 14, borderRadius: radius.md, borderWidth: 2, borderColor: method === p.id ? c.brand : c.border, backgroundColor: method === p.id ? c.brand50 : c.surface }}>
                  <Text style={{ color: c.text, fontWeight: "700", textAlign: "center" }}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
            <Muted>Paiement simulé en démo. CinetPay/PayDunya en production.</Muted>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Retour" variant="ghost" style={{ flex: 1 }} onPress={() => setStep(2)} disabled={paying} />
              <Button label={`Payer ${fcfa(chosen.price)}`} variant="accent" style={{ flex: 1.4 }} onPress={pay} loading={paying} />
            </View>
          </>
        )}

        {step === 4 && contract && (
          <>
            <Card style={{ backgroundColor: c.successBg, borderColor: c.success }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="checkmark-circle" size={26} color={c.success} />
                <Body style={{ flex: 1, fontWeight: "700" }}>Véhicule assuré 🎉</Body>
              </View>
            </Card>
            <Card>
              <Muted>Contrat</Muted>
              <Body style={{ fontWeight: "800", fontSize: 18 }}>{contract.number}</Body>
              <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
              <Row k="Assureur" v={contract.insurer} c={c} />
              <Row k="Formule" v={contract.coverageName} c={c} />
              <Row k="Prime" v={fcfa(contract.price)} c={c} />
            </Card>
            <Button label="Voir mes contrats" onPress={() => router.push("/(tabs)/contracts")} />
            <Button label="Nouveau devis" variant="ghost" onPress={() => { setStep(0); setChosen(null); setContract(null); }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ k, v, c }: { k: string; v: string; c: ReturnType<typeof useColors> }) {
  return (
    <View style={[ui.rowBetween, { paddingVertical: 4 }]}>
      <Muted>{k}</Muted>
      <Text style={{ color: c.text, fontWeight: "700" }}>{v}</Text>
    </View>
  );
}

function Steps({ step, c }: { step: number; c: ReturnType<typeof useColors> }) {
  const labels = ["Véhicule", "Formule", "Comparer", "Paiement"];
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {labels.map((l, i) => (
        <View key={l} style={{ flex: 1, gap: 4 }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= step ? c.brand : c.border }} />
          <Text style={{ fontSize: 10, color: i <= step ? c.brand : c.textMuted, fontWeight: "600" }}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

function Center({ c }: { c: ReturnType<typeof useColors> }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
      <ActivityIndicator color={c.brand} size="large" />
    </View>
  );
}
