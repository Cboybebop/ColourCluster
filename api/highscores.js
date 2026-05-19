const KEY = 'colour-cluster-highscores';

function sortScores(scores) {
  return scores
    .filter((row) => row && Number.isFinite(Number(row.score)) && row.name)
    .map((row) => ({ name: String(row.name).slice(0, 12), score: Number(row.score) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

async function kvFetch(path, options = {}) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`KV request failed: ${response.status}`);
  return response.json();
}

async function getScores() {
  const data = await kvFetch(`/get/${KEY}`);
  const raw = data?.result ? JSON.parse(data.result) : [];
  return sortScores(raw);
}

async function saveScores(scores) {
  await kvFetch(`/set/${KEY}`, { method: 'POST', body: JSON.stringify(scores) });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return res.status(200).json({ source: 'fallback', scores: [] });
      }
      const scores = await getScores();
      return res.status(200).json({ source: 'kv', scores });
    }

    if (req.method === 'POST') {
      const { name, score } = req.body || {};
      const cleanName = String(name || 'Player').trim().slice(0, 12) || 'Player';
      const cleanScore = Number(score || 0);
      if (!Number.isFinite(cleanScore) || cleanScore < 0) {
        return res.status(400).json({ error: 'invalid score' });
      }

      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return res.status(202).json({ source: 'fallback', accepted: true });
      }

      const scores = await getScores();
      scores.push({ name: cleanName, score: cleanScore });
      const next = sortScores(scores);
      await saveScores(next);
      return res.status(200).json({ source: 'kv', scores: next });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: 'server error' });
  }
}
