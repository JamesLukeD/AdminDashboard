"use client";
import { useState, useRef } from "react";
import { TRACKED_COMPETITORS, getTrackedCompetitor } from "@/lib/tracked-competitors";
import type { TrackedCompetitor } from "@/lib/tracked-competitors";

function handleScreamingFrogUpload(idx: number, file: File, setCompanies: (c: TrackedCompetitor[]) => void, companies: TrackedCompetitor[]) {
  const reader = new FileReader();
  reader.onload = (e) => {
    // For now, just store the file name in the company object
    const updated = companies.map((c, i) => i === idx ? { ...c, sfExport: file.name } : c);
    setCompanies(updated);
    // TODO: Parse file, compare with previous, show detected changes
  };
  reader.readAsText(file);
}

export default function TrackedCompaniesPage() {
  const [companies, setCompanies] = useState<TrackedCompetitor[]>(TRACKED_COMPETITORS);
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newUrl, setNewUrl] = useState("");

  function addCompany() {
    if (!newName.trim() || !newDomain.trim()) return;
    setCompanies([...companies, { name: newName, domainPattern: newDomain, url: newUrl }]);
    setNewName(""); setNewDomain(""); setNewUrl("");
  }

  function removeCompany(idx: number) {
    setCompanies(companies.filter((_, i) => i !== idx));
  }

  function updateCompany(idx: number, field: keyof TrackedCompetitor, value: string) {
    setCompanies(companies.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-[#0d1117] rounded-xl border border-[#21262d]">
      <h2 className="text-xl font-bold text-[#e6edf3] mb-4">Tracked Companies</h2>
      <ul className="mb-6">
        {companies.map((c, idx) => (
          <li key={idx} className="flex items-center gap-2 mb-2">
            <input value={c.name} onChange={e => updateCompany(idx, "name", e.target.value)} className="px-2 py-1 rounded bg-[#21262d] text-[#e6edf3] w-32" />
            <input value={c.domainPattern} onChange={e => updateCompany(idx, "domainPattern", e.target.value)} className="px-2 py-1 rounded bg-[#21262d] text-[#e6edf3] w-48" />
            <input value={c.url} onChange={e => updateCompany(idx, "url", e.target.value)} className="px-2 py-1 rounded bg-[#21262d] text-[#e6edf3] w-48" />
            <button onClick={() => removeCompany(idx)} className="px-2 py-1 bg-[#ff4466] text-white rounded">Remove</button>
            <input type="file" accept=".csv,.xlsx" style={{ display: "none" }} id={`sf-upload-${idx}`} onChange={e => {
              if (e.target.files?.[0]) handleScreamingFrogUpload(idx, e.target.files[0], setCompanies, companies);
            }} />
            <label htmlFor={`sf-upload-${idx}`} className="px-2 py-1 bg-[#00ff88] text-[#060a0f] rounded cursor-pointer">Upload SF Export</label>
            {c.sfExport && <span className="text-xs text-[#a0c4d8]">{c.sfExport}</span>}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="px-2 py-1 rounded bg-[#21262d] text-[#e6edf3] w-32" />
        <input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="Domain pattern" className="px-2 py-1 rounded bg-[#21262d] text-[#e6edf3] w-48" />
        <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="URL" className="px-2 py-1 rounded bg-[#21262d] text-[#e6edf3] w-48" />
        <button onClick={addCompany} className="px-2 py-1 bg-[#00ff88] text-[#060a0f] rounded">Add</button>
      </div>
      <p className="mt-4 text-xs text-[#a0c4d8]">Changes are local for now. Persistent storage and change detection coming next.</p>
    </div>
  );
}
