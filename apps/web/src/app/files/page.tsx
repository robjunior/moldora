"use client";

import { useEffect, useMemo, useState } from "react";
import { api, API_BASE } from "../../lib/api";

type Customer = { id: string; name: string };
type File3D = { id: string; originalName: string; format: string; sizeBytes: number; storageKey: string; customerId: string; createdAt: string };
type SlicingJob = { id: string; fileId: string; status: string; mode?: string; normalizedResult?: any; rawResult?: any; errorMessage?: string | null; createdAt: string; updatedAt: string; file?: { originalName?: string } };

const statusColor: Record<string, string> = { QUEUED: "#f59e0b", RUNNING: "#3b82f6", SUCCEEDED: "#22c55e", FAILED: "#ef4444" };

export default function FilesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [files, setFiles] = useState<File3D[]>([]);
  const [jobs, setJobs] = useState<SlicingJob[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [mode, setMode] = useState("auto");
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadAll(fileFilter?: string) {
    try {
      const [c, f, j] = await Promise.all([
        api<Customer[]>("/customers"),
        api<File3D[]>("/files"),
        api<SlicingJob[]>(`/slicing-jobs${fileFilter ? `?fileId=${encodeURIComponent(fileFilter)}` : ""}`),
      ]);
      setCustomers(c);
      setFiles(f);
      setJobs(j);
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    }
  }

  useEffect(() => { loadAll(selectedFileId || undefined); }, [selectedFileId]);

  useEffect(() => {
    const hasActive = jobs.some(j => j.status === "QUEUED" || j.status === "RUNNING");
    if (!hasActive) return;
    const t = setInterval(async () => {
      try { setJobs(await api<SlicingJob[]>(`/slicing-jobs${selectedFileId ? `?fileId=${encodeURIComponent(selectedFileId)}` : ""}`)); } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [jobs, selectedFileId]);

  const selectedFile = useMemo(() => files.find(f => f.id === selectedFileId), [files, selectedFileId]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return setError("Select a customer before uploading");
    if (!uploadFile) return setError("Select a 3D file to upload");
    setBusy("upload"); setError(null); setNotice(null);
    try {
      const fd = new FormData();
      fd.append("customerId", customerId);
      fd.append("file", uploadFile);
      const res = await fetch(`${API_BASE}/files/upload`, { method: "POST", body: fd });
      const text = await res.text();
      let data: any = text; try { data = JSON.parse(text); } catch {}
      if (!res.ok) throw new Error(data?.message || "Upload failed");
      setNotice(`Uploaded ${data.originalName || uploadFile.name}`);
      setUploadFile(null);
      (e.target as HTMLFormElement).reset();
      await loadAll(selectedFileId || undefined);
      if (data.id) setSelectedFileId(data.id);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally { setBusy(null); }
  }

  async function createJob(fileId: string) {
    setBusy(`job:${fileId}`); setError(null); setNotice(null);
    try {
      const job = await api<SlicingJob>("/slicing-jobs", { method: "POST", body: JSON.stringify({ fileId, mode }) });
      setNotice(`Slicing job queued: ${job.id}`);
      await loadAll(selectedFileId || undefined);
    } catch (e: any) { setError(e.message || "Failed to create slicing job"); }
    finally { setBusy(null); }
  }

  async function reprocess(jobId: string) {
    setBusy(`re:${jobId}`); setError(null); setNotice(null);
    try {
      await api(`/slicing-jobs/${jobId}/reprocess`, { method: "POST", body: JSON.stringify({}) });
      setNotice(`Reprocessing job ${jobId}`);
      await loadAll(selectedFileId || undefined);
    } catch (e: any) { setError(e.message || "Failed to reprocess job"); }
    finally { setBusy(null); }
  }

  return (
    <main style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      <h1>Files &amp; Slicing</h1>
      <p style={{ opacity: 0.8 }}>Upload 3D files, create slicing jobs, and track normalized results. API: <code>{API_BASE}</code></p>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {notice && <p style={{ color: "#4ade80" }}>{notice}</p>}

      <section style={{ border: "1px solid #333", borderRadius: 8, padding: 16, margin: "16px 0" }}>
        <h2 style={{ marginTop: 0 }}>Upload file</h2>
        <form onSubmit={onUpload} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="file" accept=".stl,.3mf,.obj,.vox,.STL,.3MF,.OBJ,.VOX" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
          <button type="submit" disabled={busy === "upload"}>{busy === "upload" ? "Uploading..." : "Upload"}</button>
        </form>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ border: "1px solid #333", borderRadius: 8, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Files</h2>
          <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setSelectedFileId("")}>Show all jobs</button>
            <label>Mode:&nbsp;
              <select value={mode} onChange={e => setMode(e.target.value)}>
                <option value="auto">auto</option>
                <option value="mock">mock</option>
                <option value="cli">cli</option>
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {files.map(f => (
              <div key={f.id} style={{ border: selectedFileId === f.id ? "1px solid #60a5fa" : "1px solid #222", borderRadius: 6, padding: 10 }}>
                <div><b>{f.originalName}</b> <span style={{ opacity: 0.7 }}>({f.format}, {f.sizeBytes} bytes)</span></div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>ID: {f.id} · Customer: {f.customerId}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <button onClick={() => createJob(f.id)} disabled={busy === `job:${f.id}`}>{busy === `job:${f.id}` ? "Queuing..." : "Create slicing job"}</button>
                  <button onClick={() => setSelectedFileId(f.id)}>View jobs</button>
                </div>
              </div>
            ))}
            {!files.length && <p>No files uploaded yet.</p>}
          </div>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 8, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Slicing jobs {selectedFile ? `— ${selectedFile.originalName}` : "(all)"}</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {jobs.map(j => (
              <div key={j.id} style={{ border: "1px solid #222", borderRadius: 6, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div><b>{j.id}</b></div>
                  <div style={{ color: statusColor[j.status] || "#e5e7eb", fontWeight: 700 }}>{j.status}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>File: {j.file?.originalName || j.fileId} · Mode: {j.mode || "-"}</div>
                {j.errorMessage && <div style={{ color: "#f87171", marginTop: 6 }}>Error: {j.errorMessage}</div>}
                {j.normalizedResult && (
                  <details style={{ marginTop: 8 }}>
                    <summary>Normalized result</summary>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(j.normalizedResult, null, 2)}</pre>
                  </details>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button onClick={() => reprocess(j.id)} disabled={busy === `re:${j.id}` || j.status === "QUEUED" || j.status === "RUNNING"}>
                    {busy === `re:${j.id}` ? "Reprocessing..." : "Reprocess"}
                  </button>
                </div>
              </div>
            ))}
            {!jobs.length && <p>No slicing jobs yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
