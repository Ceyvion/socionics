import React, { useEffect, useMemo, useRef, useState } from "react";

// --- Data loading hook ---
function useData() {
  const [data, setData] = useState({ types: null, glossary: null, relations: null, error: null });
  useEffect(() => {
    Promise.all([
      fetch("/data/types.json").then(r=>r.json()),
      fetch("/data/glossary.json").then(r=>r.json()),
      fetch("/data/relations.json").then(r=>r.json()),
    ]).then(([types, glossary, relations]) => {
      setData({ types, glossary, relations, error: null });
    }).catch(err => setData({ types: null, glossary: null, relations: null, error: err.message }));
  }, []);
  return data;
}

export default function WikisocionMVP() {
  const { types, glossary, relations, error } = useData();
  
  if (error) {
    return <div className="p-6 text-red-700">Data load failed: {error}</div>;
  }
  
  if (!types || !glossary || !relations) {
    return <div className="p-6">Loading…</div>;
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Wikisocion MVP</h1>
      <p>Types: {types.length}</p>
      <p>Glossary: {glossary.length}</p>
      <p>Relations: {relations.length}</p>
    </div>
  );
}