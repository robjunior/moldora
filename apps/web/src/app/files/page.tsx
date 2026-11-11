"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, API_BASE } from "../../lib/api";

type Customer = { id: string; name: string };
type File3D = { id: string; originalName: string; format: string; sizeBytes: number; storageKey: string; customerId: string; createdAt: string };
type SlicingJob = { id: string; fileId: string; status: string; mode?: string; normalizedResult?: any; rawResult?: any; errorMessage?: string | null; createdAt: string; updatedAt: string; file?: { originalName?: string } };

const statusColor: Record<string, string> = { QUEUED: "#f59e0b", RUNNING: "#3b82f6", SUCCEEDED: "#22c55e", FAILED: "#ef4444" };

function ModelViewer({ file }: { file: File3D }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        setErr(null); setLoading(true);
        const THREE = await import("three");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        let object: any;
        let geometry: any;
        const url = `${API_BASE}/files/${file.id}/content`;
        if (file.format === "STL") {
          const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
          geometry = await new Promise<any>((resolve, reject) => new STLLoader().load(url, resolve, undefined, reject));
          geometry.computeVertexNormals();
          object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#9ca3af", metalness: 0.1, roughness: 0.8 }));
        } else if (file.format === "OBJ") {
          const { OBJLoader } = await import("three/examples/jsm/loaders/OBJLoader.js");
          object = await new Promise<any>((resolve, reject) => new OBJLoader().load(url, resolve, undefined, reject));
          object.traverse((c: any) => { if (c.isMesh) c.material = new THREE.MeshStandardMaterial({ color: "#9ca3af", metalness: 0.1, roughness: 0.8 }); });
        } else {
          setErr(`Preview not available for ${file.format}. Use download.`);
          setLoading(false);
          return;
        }
        if (disposed || !containerRef.current) return;
        const el = containerRef.current;
        el.innerHTML = "";
        const w = el.clientWidth || 480, h = 360;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#111827");
        const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        el.appendChild(renderer.domElement);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.0));
        const dir = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(1, 2, 3); scene.add(dir);
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3(); const center = new THREE.Vector3();
        box.getSize(size); box.getCenter(center);
        object.position.sub(center);
        scene.add(object);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        camera.position.set(maxDim * 1.6, maxDim * 1.2, maxDim * 1.6);
        camera.near = maxDim / 100; camera.far = maxDim * 100; camera.updateProjectionMatrix();
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        let raf = 0;
        const animate = () => { if (disposed) return; raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
        animate();
        setLoading(false);
        cleanup = () => { cancelAnimationFrame(raf); controls.dispose(); renderer.dispose(); geometry?.dispose?.(); scene.clear(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); };
      } catch (e: any) {
        if (!disposed) { setErr(e?.message || "Failed to load preview"); setLoading(false); }
      }
    })();
    return () => { disposed = true; cleanup?.(); };
  }, [file.id, file.format]);

  return (
    <div>
      {loading && !err && <p style={{ opacity: 0.8 }}>Loading 3D preview...</p>}
      {err && <p style={{ color: "#f87171" }}>{err}</p>}
      <div ref={containerRef} style={{ width: "100%", height: 360, borderRadius: 8, overflow: "hidden", border: "1px solid #222" }} />
    </div>
  );
}

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
  const selectedPreviewable = selectedFile && (selectedFile.format === "STL" || selectedFile.format === "OBJ");

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
                  <button onClick={() => setSelectedFileId(f.id)}>View / Preview</button>
                  <a href={`${API_BASE}/files/${f.id}/content`} target="_blank" rel="noreferrer">Download / Open</a>
                </div>
              </div>
            ))}
            {!files.length && <p>No files uploaded yet.</p>}
          </div>
        </div>

        <div style={{ border: "1px solid #333", borderRadius: 8, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Slicing jobs {selectedFile ? `— ${selectedFile.originalName}` : "(all)"}</h2>
          {selectedFile && (
            <div style={{ border: "1px solid #222", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Preview</h3>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                {selectedFile.originalName} ({selectedFile.format}) · <a href={`${API_BASE}/files/${selectedFile.id}/content`} target="_blank" rel="noreferrer">Download</a>
              </div>
              {selectedPreviewable ? (
                <ModelViewer file={selectedFile} />
              ) : (
                <p style={{ opacity: 0.8, margin: 0 }}>3D preview is currently available for STL/OBJ files. Use Download for {selectedFile.format}.</p>
              )}
            </div>
          )}
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
