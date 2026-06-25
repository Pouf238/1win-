"use client";
// ==========================================================================
// Assur Chap — Gestion des véhicules
// ==========================================================================
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Modal } from "@/components/ui";
import { VehicleCard } from "@/components/cards";
import { useToast } from "@/components/Toast";
import { getStore } from "@/lib/store";
import type { Usage, Vehicle } from "@/lib/types";

const EMPTY = {
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  plate: "",
  vin: "",
  power: 7,
  fuel: "Essence",
  value: 5000000,
  usage: "personnel" as Usage,
};

export default function VehiclesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function refresh() {
    setVehicles(getStore().vehicles());
  }
  useEffect(refresh, []);

  function set<K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.brand || !form.model || !form.plate) {
      toast("Marque, modèle et immatriculation requis.", "err");
      return;
    }
    getStore().addVehicle(form);
    toast("Véhicule ajouté 🚗", "ok");
    setOpen(false);
    setForm(EMPTY);
    refresh();
  }

  function remove(id: string) {
    getStore().removeVehicle(id);
    toast("Véhicule retiré.", "info");
    refresh();
  }

  return (
    <div className="stack">
      <div className="hello">
        <div>
          <h2>Mes véhicules</h2>
          <p className="soft">Enregistrez vos véhicules pour obtenir un devis en quelques secondes.</p>
        </div>
        <button className="btn btn-accent" onClick={() => setOpen(true)}>
          <Icon.plus size={18} /> Ajouter un véhicule
        </button>
      </div>

      <div className="card card-2" style={{ borderStyle: "dashed" }}>
        <div className="row gap-sm">
          <span className="icon-tile accent">
            <Icon.sparkle size={20} />
          </span>
          <div>
            <strong>OCR carte grise (Phase 3)</strong>
            <div className="soft" style={{ fontSize: ".88rem" }}>
              Bientôt : prenez en photo votre carte grise, l&apos;IA pré-remplira automatiquement ces champs.
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {vehicles.map((v) => (
          <VehicleCard key={v.id} vehicle={v} onQuote={() => router.push("/app/quote?vehicle=" + v.id)} onRemove={() => remove(v.id)} />
        ))}
        {vehicles.length === 0 && (
          <div className="card empty">
            <span className="icon-tile">
              <Icon.car size={24} />
            </span>
            <p>Aucun véhicule enregistré.</p>
          </div>
        )}
      </div>

      {open && (
        <Modal title="Ajouter un véhicule" onClose={() => setOpen(false)}>
          <form onSubmit={save}>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field">
                  <label className="label">Marque</label>
                  <input className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Toyota" />
                </div>
                <div className="field">
                  <label className="label">Modèle</label>
                  <input className="input" value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Corolla" />
                </div>
                <div className="field">
                  <label className="label">Année</label>
                  <input className="input" type="number" value={form.year} onChange={(e) => set("year", +e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Immatriculation</label>
                  <input className="input" value={form.plate} onChange={(e) => set("plate", e.target.value)} placeholder="AB-1234-CI" />
                </div>
                <div className="field full">
                  <label className="label">Numéro de châssis (VIN)</label>
                  <input className="input" value={form.vin} onChange={(e) => set("vin", e.target.value)} placeholder="JTDBR32E720123456" />
                </div>
                <div className="field">
                  <label className="label">Puissance fiscale (CV)</label>
                  <input className="input" type="number" value={form.power} onChange={(e) => set("power", +e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Carburant</label>
                  <select className="select" value={form.fuel} onChange={(e) => set("fuel", e.target.value)}>
                    <option>Essence</option>
                    <option>Diesel</option>
                    <option>Hybride</option>
                    <option>Électrique</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">Valeur (FCFA)</label>
                  <input className="input" type="number" value={form.value} onChange={(e) => set("value", +e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">Usage</label>
                  <select className="select" value={form.usage} onChange={(e) => set("usage", e.target.value as Usage)}>
                    <option value="personnel">Personnel</option>
                    <option value="professionnel">Professionnel</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary btn-block">
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
