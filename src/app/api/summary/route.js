export const runtime = 'edge';

const EXCHANGES = ['nasdaq', 'nyse', 'amex'];   // we’ll try these in order

export async function POST(req) {
  const { ticker } = await req.json();
  if (!ticker) return new Response(JSON.stringify({ error: 'Ticker required' }), { status: 400 });

  const key = process.env.EC_KEY;

  // 1️⃣  Find the latest quarter that has a transcript
  let found;
  for (const ex of EXCHANGES) {
    const evRes = await fetch(
      `https://v2.api.earningscall.biz/events?apikey=${key}&exchange=${ex}&symbol=${ticker}`
    );
    if (!evRes.ok) continue;                       // try the next exchange
    const ev = await evRes.json();
    if (ev?.events?.length) {
      const { year, quarter } = ev.events[0];      // latest call is first
      found = { ex, year, quarter };
      break;
    }
  }
  if (!found) return new Response(JSON.stringify({ error: 'No transcript found' }), { status: 404 });

  // 2️⃣  Pull the transcript text
  const trRes = await fetch(
    `https://v2.api.earningscall.biz/transcript` +
    `?apikey=${key}&exchange=${found.ex}&symbol=${ticker}` +
    `&year=${found.year}&quarter=${found.quarter}`
  );
  if (!trRes.ok) return new Response(JSON.stringify({ error: 'Transcript API error' }), { status: 502 });

  const tr = await trRes.json();
  const transcriptText = tr.text || tr?.[0]?.text;
  if (!transcriptText) return new Response(JSON.stringify({ error: 'Transcript missing' }), { status: 500 });

  // 3️⃣  Summarise with Hugging Face (unchanged)
  const sumRes = await fetch(
    'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
      },
      body: JSON.stringify({
        inputs: transcriptText,
        parameters: { max_length: 220, min_length: 60, do_sample: false },
      }),
    }
  );
  const sumData = await sumRes.json();
  const summary = Array.isArray(sumData) ? sumData[0]?.summary_text : sumData?.summary_text;

  return new Response(
    JSON.stringify({
      ticker: ticker.toUpperCase(),
      date: `${found.year} Q${found.quarter}`,
      summary,
      sourceUrl: null   // EarningsCall doesn’t expose a public URL; you can omit the link
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

