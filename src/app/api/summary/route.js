export const runtime = 'edge';

export async function POST(req) {
  try {
    const { ticker } = await req.json();
    if (!ticker) {
      return new Response(JSON.stringify({ error: 'Ticker required' }), { status: 400 });
    }

    const fmpKey = process.env.FMP_KEY;
    const transcriptRes = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_call_transcript/${ticker}?limit=1&apikey=${fmpKey}`
    );

    if (!transcriptRes.ok) {
      return new Response(JSON.stringify({ error: 'Problem fetching transcript' }), { status: 500 });
    }

    const [latest] = await transcriptRes.json();
    if (!latest?.content) {
      return new Response(JSON.stringify({ error: 'Transcript not found' }), { status: 404 });
    }

    const hfToken = process.env.HF_TOKEN;
    const hfRes = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hfToken}`,
      },
      body: JSON.stringify({
        inputs: latest.content,
        parameters: { max_length: 220, min_length: 60, do_sample: false },
      }),
    });

    if (!hfRes.ok) {
      return new Response(JSON.stringify({ error: 'Problem summarising transcript' }), { status: 500 });
    }

    const hfData = await hfRes.json();
    const summary = Array.isArray(hfData) ? hfData[0]?.summary_text : hfData?.summary_text;

    return new Response(JSON.stringify({
      ticker: ticker.toUpperCase(),
      date: latest.date,
      summary,
      sourceUrl: latest.url || latest.link,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), { status: 500 });
  }
}
