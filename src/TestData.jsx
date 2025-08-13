import React, { useEffect, useState } from "react";

function TestData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/types.json").then(r => r.json()),
      fetch("/data/glossary.json").then(r => r.json()),
      fetch("/data/relations.json").then(r => r.json()),
    ]).then(([types, glossary, relations]) => {
      setData({ types, glossary, relations });
    }).catch(err => {
      setError(err.message);
    });
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Test Data</h1>
      <p>Types: {data.types.length}</p>
      <p>Glossary: {data.glossary.length}</p>
      <p>Relations: {data.relations.length}</p>
    </div>
  );
}

export default TestData;