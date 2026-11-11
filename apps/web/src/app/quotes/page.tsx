"use client";
import { useEffect, useMemo, useState } from "react";
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

function n(v: any, fb = 0) { const x = Number(v); return Number.isFinite(x) ? x : fb; }

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(defaultPricing);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<any>(null);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [item, setItem] = useState<any>({
    fileId: "", slicingJobId: "", materialId: "", description: "", quantity: 1,
    volumeMl: "", printTimeHours: "", pricePerLiter: "", machineCostPerHour: "",
    energyCost: "", operationCost: "", laborCost: "", lossRate: "", marginRate: "",
  });

  async function loadAll() {
    try {
      const [q, c, m, f, j, s] = await Promise.all([
        api<any[]>("/quotes"),
        api<any[]>("/customers"),
        api<any[]>("/materials").catch(() => []),
        api<any[]>("/files").catch(() => []),
        api<any[]>("/slicing-jobs").catch(() => []),
        api<any>("/settings/pricing").catch(() => defaultPricing),
      ]);
      setQuotes(q); setCustomers(c); setMaterials(m); setFiles(f); setJobs(j); setSettings({ ...defaultPricing, ...(s || {}) });
    } catch (e: any) { setError(e.message); }
  }

  async function loadDetail(id: string) {
    if (!id) return setDetail(null);
    try { setDetail(await api<any>(`/quotes/${id}`)); } catch (e: any) { setError(e.message); }
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (selectedId) loadDetail(selectedId); else setDetail(null); }, [selectedId]);

  const fileJobs = useMemo(() => jobs.filter(j => j.fileId === item.fileId), [jobs, item.fileId]);
  const canEdit = detail && ["DRAFT", "REVIEW", "PROCESSING"].includes(detail.status);

  function prefillFromContext(fileId: string, slicingJobId: string, materialId: string) {
    const file = files.find(f => f.id === fileId);
    const job = jobs.find(j => j.id === slicingJobId) || jobs.filter(j => j.fileId === fileId && j.status === "SUCCEEDED")[0];
    const mat = materials.find(m => m.id === materialId);
    const nr = job?.normalizedResult || {};
    setItem((prev: any) => ({
      ...prev,
      fileId,
      slicingJobId: slicingJobId || (job?.id || ""),
      materialId,
      description: prev.description || file?.originalName || prev.description || "",
      volumeMl: prev.volumeMl !== "" ? prev.volumeMl : (nr.volumeMl ?? ""),
      printTimeHours: prev.printTimeHours !== "" ? prev.printTimeHours : (nr.printTimeSec ? (Number(nr.printTimeSec) / 3600).toFixed(4) : ""),
      pricePerLiter: prev.pricePerLiter !== "" ? prev.pricePerLiter : (mat?.pricePerLiter ?? ""),
      machineCostPerHour: prev.machineCostPerHour !== "" ? prev.machineCostPerHour : (settings.machineCostPerHour ?? ""),
      energyCost: prev.energyCost !== "" ? prev.energyCost : (settings.energyCostPerJob ?? ""),
      operationCost: prev.operationCost !== "" ? prev.operationCost : (settings.operationCostPerJob ?? ""),
      laborCost: prev.laborCost !== "" ? prev.laborCost : (settings.laborCostPerJob ?? ""),
      lossRate: prev.lossRate !== "" ? prev.lossRate : (settings.lossRate ?? ""),
      marginRate: prev.marginRate !== "" ? prev.marginRate : (settings.defaultMarginRate ?? ""),
    }));
  }

  async function createQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return setError("Select a customer");
    setBusy("create"); setError(null); setNotice(null);
    try {
      const q = await api<any>("/quotes", { method: "POST", body: JSON.stringify({ customerId, notes }) });
      setNotes(""); setCustomerId(""); setNotice(`Quote created: ${q.id}`);
      await loadAll(); setSelectedId(q.id);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function action(id: string, act: string) {
    setBusy(act); setError(null); setNotice(null);
    try { await api(`/quotes/${id}/${act}`, { method: "POST", body: JSON.stringify({}) }); await loadAll(); await loadDetail(id); setNotice(`Action ${act} completed`); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }
  async function createOrder(quoteId: string) {
    setBusy("order"); setError(null); setNotice(null);
    try { const o = await api<any>("/orders", { method: "POST", body: JSON.stringify({ quoteId }) }); await loadAll(); await loadDetail(quoteId); setNotice(`Order created: ${o.id}`); }
    catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setBusy("add-item"); setError(null); setNotice(null);
    try {
      const pricingInput = {
        volumeMl: n(item.volumeMl), pricePerLiter: n(item.pricePerLiter), printTimeHours: n(item.printTimeHours),
        machineCostPerHour: n(item.machineCostPerHour), energyCost: n(item.energyCost), operationCost: n(item.operationCost),
        laborCost: n(item.laborCost), lossRate: n(item.lossRate), marginRate: n(item.marginRate),
      };
      await api(`/quotes/${selectedId}/items`, {
        method: "POST",
        body: JSON.stringify({
          fileId: item.fileId || undefined,
          slicingJobId: item.slicingJobId || undefined,
          materialId: item.materialId || undefined,
          description: item.description || undefined,
          quantity: n(item.quantity, 1),
          currency: settings.currency || "BRL",
          pricingInput,
        }),
      });
      await api(`/quotes/${selectedId}/recalc`, { method: "POST", body: JSON.stringify({}) });
      await loadAll(); await loadDetail(selectedId);
      setNotice("Item added and quote recalculated");
      setItem({ fileId: "", slicingJobId: "", materialId: "", description: "", quantity: 1, volumeMl: "", printTimeHours: "", pricePerLiter: "", machineCostPerHour: "", energyCost: "", operationCost: "", laborCost: "", lossRate: "", marginRate: "" });
    } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  }

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <h1>Quotes</h1>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {notice && <p style={{ color: "#4ade80" }}>{notice}</p>}

      <form onSubmit={createQuote} style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
        <select value={customerId} onChange={e=>setCustomerId(e.target.value)}>
          <option value="">Select customer</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="Notes" value={notes} onChange={e=>setNotes(e.target.value)} style={{ minWidth: 260 }} />
        <button type="submit" disabled={busy==="create"}>{busy==="create"?"Creating...":"Create Quote"}</button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 12 }}>
          {quotes.map(q => (
            <div key={q.id} onClick={() => setSelectedId(q.id)} style={{ border: selectedId===q.id?"1px solid #60a5fa":"1px solid #333", borderRadius: 8, padding: 12, cursor: "pointer" }}>
              <div><b>{q.id}</b> — {q.status}</div>
              <div>{q.customer?.name || q.customerId}</div>
              <div>Total: {q.total ?? "-"} {q.currency} · Items: {q.items?.length || 0}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button onClick={(e)=>{e.stopPropagation(); action(q.id, "recalc");}}>Recalc</button>
                <button onClick={(e)=>{e.stopPropagation(); action(q.id, "send");}}>Send</button>
                <button onClick={(e)=>{e.stopPropagation(); action(q.id, "approve");}}>Approve</button>
                <button onClick={(e)=>{e.stopPropagation(); action(q.id, "reject");}}>Reject</button>
                <button onClick={(e)=>{e.stopPropagation(); createOrder(q.id);}}>Create Order</button>
                <a href={`${API_BASE}/quotes/${q.id}/proposal`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>Proposal</a>
              </div>
            </div>
          ))}
          {!quotes.length && <p>No quotes yet.</p>}
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 8, padding: 16 }}>
          {!detail ? <p>Select a quote to view details and add items.</p> : (
            <>
              <h2 style={{ marginTop: 0 }}>Quote detail</h2>
              <div><b>{detail.id}</b> — {detail.status} — {detail.customer?.name}</div>
              <div>Subtotal: {detail.subtotal ?? 0} · Total: {detail.total ?? 0} {detail.currency}</div>
              <h3>Items ({detail.items?.length || 0})</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {(detail.items || []).map((it: any) => (
                  <div key={it.id} style={{ border: "1px solid #222", borderRadius: 6, padding: 8 }}>
                    <div><b>{it.description || it.file?.originalName || "Item"}</b> × {it.quantity}</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>File: {it.file?.originalName || it.fileId || "-"} · Material: {it.material?.name || "-"} · Slicing: {it.slicingJobId || "-"} ({it.slicingJob?.status || "-"})</div>
                    <div>Unit: {it.unitPrice} · Total: {it.totalPrice}</div>
                    {it.breakdownJson && <details><summary>Pricing breakdown</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(it.breakdownJson, null, 2)}</pre></details>}
                  </div>
                ))}
                {!detail.items?.length && <p>No items yet.</p>}
              </div>

              <h3>Add item</h3>
              {!canEdit ? <p style={{ opacity: 0.8 }}>Quote is not editable in status {detail.status}.</p> : (
                <form onSubmit={addItem} style={{ display: "grid", gap: 8 }}>
                  <select value={item.fileId} onChange={e => prefillFromContext(e.target.value, "", item.materialId)}>
                    <option value="">Select file (optional)</option>
                    {files.map(f => <option key={f.id} value={f.id}>{f.originalName} ({f.id.slice(0,8)})</option>)}
                  </select>
                  <select value={item.slicingJobId} onChange={e => prefillFromContext(item.fileId, e.target.value, item.materialId)}>
                    <option value="">Select slicing job (optional)</option>
                    {(item.fileId ? fileJobs : jobs).slice(0,50).map(j => <option key={j.id} value={j.id}>{j.id.slice(0,8)} · {j.status} · {j.file?.originalName || j.fileId}</option>)}
                  </select>
                  <select value={item.materialId} onChange={e => prefillFromContext(item.fileId, item.slicingJobId, e.target.value)}>
                    <option value="">Select material (optional)</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.pricePerLiter}/L)</option>)}
                  </select>
                  <input placeholder="Description" value={item.description} onChange={e=>setItem({...item, description:e.target.value})} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    <label>Qty<input type="number" value={item.quantity} onChange={e=>setItem({...item, quantity:e.target.value})} /></label>
                    <label>Volume (mL)<input value={item.volumeMl} onChange={e=>setItem({...item, volumeMl:e.target.value})} /></label>
                    <label>Print time (h)<input value={item.printTimeHours} onChange={e=>setItem({...item, printTimeHours:e.target.value})} /></label>
                    <label>Price/L<input value={item.pricePerLiter} onChange={e=>setItem({...item, pricePerLiter:e.target.value})} /></label>
                    <label>Machine $/h<input value={item.machineCostPerHour} onChange={e=>setItem({...item, machineCostPerHour:e.target.value})} /></label>
                    <label>Energy<input value={item.energyCost} onChange={e=>setItem({...item, energyCost:e.target.value})} /></label>
                    <label>Operation<input value={item.operationCost} onChange={e=>setItem({...item, operationCost:e.target.value})} /></label>
                    <label>Labor<input value={item.laborCost} onChange={e=>setItem({...item, laborCost:e.target.value})} /></label>
                    <label>Loss rate<input value={item.lossRate} onChange={e=>setItem({...item, lossRate:e.target.value})} /></label>
                    <label>Margin rate<input value={item.marginRate} onChange={e=>setItem({...item, marginRate:e.target.value})} /></label>
                  </div>
                  <button type="submit" disabled={busy==="add-item"}>{busy==="add-item"?"Adding...":"Add item & recalc"}</button>
                  <p style={{ fontSize: 12, opacity: 0.75 }}>Pricing inputs are sent to the API (volume, costs, margin/loss). Selecting a succeeded slicing job and material helps prefill volume/time/price-per-liter; defaults come from pricing settings.</p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
