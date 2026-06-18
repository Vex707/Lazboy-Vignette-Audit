// Serverless proxy. The Anthropic API key lives only here, as an environment
// variable set in the Vercel dashboard (Settings -> Environment Variables ->
// ANTHROPIC_API_KEY). It is never sent to the browser.

export const config = {
  maxDuration: 60, // allow time for the model to think
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: { message: 'Server is missing ANTHROPIC_API_KEY. Set it in Vercel project settings.' } });
    return;
  }

  // Vercel parses JSON bodies automatically; fall back to manual parse if needed.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const content = body && body.content;
  if (!content) {
    res.status(400).json({ error: { message: 'Missing content in request body.' } });
    return;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high' },
        messages: [{ role: 'user', content }],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json(data);
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to reach the audit service: ' + (err && err.message ? err.message : 'unknown error') } });
  }
}
