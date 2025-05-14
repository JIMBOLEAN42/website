'use client';
import { useState } from 'react';

export default function HomePage() {
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticker) return;
    setLoading(true);
    setData(null);
    const res = await fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: ticker.trim().toUpperCase() }),
    });
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-6 space-y-6 bg-gray-50">
      <h1 className="text-3xl font-bold">Earnings Call Summarizer</h1>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Ticker (e.g. AAPL)"
          className="border rounded px-3 py-2 focus:outline-none"
        />
        <button className="rounded bg-black text-white px-4">Summarize</button>
      </form>

      {loading && <p>Fetching & summarizing…</p>}

      {data?.error && <p className="text-red-600">{data.error}</p>}

      {data?.summary && (
        <article className="prose max-w-xl bg-white p-6 rounded-lg shadow">
          <h2>
            {data.ticker} — {data.date}
          </h2>
          <p>{data.summary}</p>
          {data.sourceUrl && (
            <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">
              Full transcript ↗
            </a>
          )}
        </article>
      )}
    </main>
  );
}
