"use client";

import { useEffect, useState } from "react";
import { api, API_BASE } from "../../lib/api";

const defaultPricing = {
  currency: "BRL",
  defaultMarginRate: 0.4,
  energyCostPerJob: 2.0,
  operationCostPerJob: 5.0,
  laborCostPerJob: 10.0,
  machineCostPerHour: 3.0,
  lossRate: 0.1,
};

export default function SettingsPage() {
  const [pricing, setPricing] = useState<any>(defaultPricing);
  const [materials, setMaterials] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [matForm, setMatForm] = useState({ name: "", type: "RESIN", pricePerLiter: "", currency: "BRL" });
  const [printerForm, setPrinterForm] = useState({ name: "", model: "" });
  const [profileForm, setProfileForm] = useState({ printerId: "", name: "" });

  async function load() {
    try {
      const [p, m, pr] = await Promise.all([
        api<any>("/settings/pricing").catch(() => defaultPricing),
        api<any[]>("/materials").catch(() => []),
        api<any[]>("/printers").catch(() => []),
      ]);
      setPricing({ ...defaultPricing, ...(p || {}) });
      setMaterials(m || []);
      setPrinters(pr || []);
      if (!profileForm.printerId && pr?.[0]?.id) setProfileForm((f) => ({ ...f, printerId: pr[0].id }));
    } catch (e: any) { setError(e.message); }
  }

  useEffect(() => { load(); }, []);

  async function savePricing(e: React.FormEvent) {
    e.preventDefault();
    setBusy("pricing"); setError(null); setNotice(null);
    try {
      const payload = {
        currency: pricing.currency || "BRL",
        defaultMarginRate: Number(pricing.defaultMarginRate),
        energyCostPerJob: Number(pricing.energyCostPerJob),
        operationCostPerJob: Number(pricing.operationCostPerJob),
        laborCostPerJob: Number(pricing.laborCostPerJob),
        machineCostPerHour: Number(pricing.machineCostPerHour),
        lossRate: Number(pricing.lossRate),
      };
      await api("/settings/pricing", { method: "PATCH", body: JSON.stringify(payload) });
      setNotice("Pricing settings saved");
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function createMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!matForm.name.trim()) return setError("Material name is required");
    setBusy("material"); setError(null); setNotice(null);
    try {
      await api("/materials", { method: "POST", body: JSON.stringify({ name: matForm.name, type: matForm.type || "RESIN", pricePerLiter: Number(matForm.pricePerLiter || 0), currency: matForm.currency || "BRL", active: true }) });
      setMatForm({ name: "", type: "RESIN", pricePerLiter: "", currency: pricing.currency || "BRL" });
      setNotice("Material created");
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function toggleMaterial(m: any) {
    setBusy(`mat:${m.id}`); setError(null); setNotice(null);
    try { await api(`/materials/${m.id}`, { method: "PATCH", body: JSON.stringify({ active: !m.active }) }); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function updateMaterialPrice(m: any) {
    const next = prompt("New price per liter", String(m.pricePerLiter ?? ""));
    if (next == null) return;
    setBusy(`mat:${m.id}`); setError(null); setNotice(null);
    try { await api(`/materials/${m.id}`, { method: "PATCH", body: JSON.stringify({ pricePerLiter: Number(next) }) }); setNotice("Material updated"); await load(); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function createPrinter(e: React.FormEvent) {
    e.preventDefault();
    if (!printerForm.name.trim()) return setError("Printer name is required");
    setBusy("printer"); setError(null); setNotice(null);
    try {
      await api("/printers", { method: "POST", body: JSON.stringify({ name: printerForm.name, model: printerForm.model || undefined, active: true }) });
      setPrinterForm({ name: "", model: "" });
      setNotice("Printer created");
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileForm.printerId || !profileForm.name.trim()) return setError("Select printer and profile name");
    setBusy("profile"); setError(null); setNotice(null);
    try {
      await api("/printers/profiles", { method: "POST", body: JSON.stringify({ printerId: profileForm.printerId, name: profileForm.name, active: true }) });
      setProfileForm((f) => ({ ...f, name: "" }));
      setNotice("Profile created");
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <h1>Settings &amp; Catalog</h1>
      <p style={{ opacity: 0.8 }}>Manage pricing defaults, materials, and printers/profiles used in quotes and slicing. API: <code>{API_BASE}</code></p>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {notice && <p style={{ color: "#4ade80" }}>{notice}</p>}

      <section style={{ border: "1px solid #333", borderRadius: 8, padding: 16, margin: "16px 0" }}>
        <h2 style={{ marginTop: 0 }}>Pricing defaults</h2>
        <form onSubmit={savePricing} style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
          <label>Currency<input value={pricing.currency || ""} onChange={e=>setPricing({ ...pricing, currency: e.target.value })} /></label>
          <label>Default margin rate<input value={pricing.defaultMarginRate ?? ""} onChange={e=>setPricing({ ...pricing, defaultMarginRate: e.target.value })} /></label>
          <label>Loss rate<input value={pricing.lossRate ?? ""} onChange={e=>setPricing({ ...pricing, lossRate: e.target.value })} /></label>
          <label>Machine $/hour<input value={pricing.machineCostPerHour ?? ""} onChange={e=>setPricing({ ...pricing, machineCostPerHour: e.target.value })} /></label>
          <label>Energy cost/job<input value={pricing.energyCostPerJob ?? ""} onChange={e=>setPricing({ ...pricing, energyCostPerJob: e.target.value })} /></label>
          <label>Operation cost/job<input value={pricing.operationCostPerJob ?? ""} onChange={e=>setPricing({ ...pricing, operationCostPerJob: e.target.value })} /></label>
          <label>Labor cost/job<input value={pricing.laborCostPerJob ?? ""} onChange={e=>setPricing({ ...pricing, laborCostPerJob: e.target.value })} /></label>
          <div style={{ display: "flex", alignItems: "end" }}><button type="submit" disabled={busy==="pricing"}>{busy==="pricing"?"Saving...":"Save pricing settings"}</button></div>
        </form>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ border: "1px solid #333", borderRadius: 8, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Materials</h2>
          <form onSubmit={createMaterial} style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <input placeholder="Name" value={matForm.name} onChange={e=>setMatForm({ ...matForm, name: e.target.value })} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input placeholder="Type (e.g. RESIN)" value={matForm.type} onChange={e=>setMatForm({ ...matForm, type: e.target.value })} />
              <input placeholder="Price per liter" value={matForm.pricePerLiter} onChange={e=>setMatForm({ ...matForm, pricePerLiter: e.target.value })} />
              <input placeholder="Currency" value={matForm.currency} onChange={e=>setMatForm({ ...matForm, currency: e.target.value })} />
              <button type="submit" disabled={busy==="material"}>{busy==="material"?"Creating...":"Add material"}</button>
            </div>
          </form>
          <div style={{ display: "grid", gap: 8 }}>
            {materials.map(m => (
              <div key={m.id} style={{ border: "1px solid #222", borderRadius: 6, padding: 10 }}>
                <div><b>{m.name}</b> {m.active ? "" : <span style={{ color: "#f87171" }}>(inactive)</span>}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{m.type} · {m.pricePerLiter} {m.currency}/L</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <button onClick={() => updateMaterialPrice(m)} disabled={busy===`mat:${m.id}`}>Update price</button>
                  <button onClick={() => toggleMaterial(m)} disabled={busy===`mat:${m.id}`}>{m.active ? "Deactivate" : "Activate"}</button>
                </div>
              </div>
            ))}
            {!materials.length && <p>No materials yet.</p>}
          </div>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 8, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Printers &amp; profiles</h2>
          <form onSubmit={createPrinter} style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input placeholder="Printer name" value={printerForm.name} onChange={e=>setPrinterForm({ ...printerForm, name: e.target.value })} />
              <input placeholder="Model" value={printerForm.model} onChange={e=>setPrinterForm({ ...printerForm, model: e.target.value })} />
              <button type="submit" disabled={busy==="printer"}>{busy==="printer"?"Creating...":"Add printer"}</button>
            </div>
          </form>
          <form onSubmit={createProfile} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <select value={profileForm.printerId} onChange={e=>setProfileForm({ ...profileForm, printerId: e.target.value })}>
              <option value="">Select printer</option>
              {printers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Profile name" value={profileForm.name} onChange={e=>setProfileForm({ ...profileForm, name: e.target.value })} />
            <button type="submit" disabled={busy==="profile"}>{busy==="profile"?"Creating...":"Add profile"}</button>
          </form>
          <div style={{ display: "grid", gap: 8 }}>
            {printers.map(p => (
              <div key={p.id} style={{ border: "1px solid #222", borderRadius: 6, padding: 10 }}>
                <div><b>{p.name}</b> {p.model ? `(${p.model})` : ""} {p.active ? "" : <span style={{ color: "#f87171" }}>(inactive)</span>}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Profiles: {(p.profiles || []).map((pr:any)=>pr.name).join(", ") || "none"}</div>
              </div>
            ))}
            {!printers.length && <p>No printers yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
