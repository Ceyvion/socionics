import React, { useEffect, useState } from "react";

function MinimalApp() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("Fetching data...");
    Promise.all([
      fetch("/data/types.json").then(r => {
        console.log("Types response:", r);
        return r.json();
      }),
      fetch("/data/glossary.json").then(r => {
        console.log("Glossary response:", r);
        return r.json();
      }),
      fetch("/data/relations.json").then(r => {
        console.log("Relations response:", r);
        return r.json();
      }),
    ]).then(([types, glossary, relations]) => {
      console.log("All data loaded:", { types, glossary, relations });
      setData({ types, glossary, relations });
    }).catch(err => {
      console.error("Error loading data:", err);
      setError(err.message);
    });
  }, []);

  if (error) {
    return <div className="p-6 text-red-700">Data load failed: {error}</div>;
  }

  if (!data) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Minimal App</h1>
      <p>Types: {data.types.length}</p>
      <p>Glossary: {data.glossary.length}</p>
      <p>Relations: {data.relations.length}</p>
    </div>
  );
}

export default MinimalApp;