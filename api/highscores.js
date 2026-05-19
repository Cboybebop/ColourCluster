const LEADERBOARD_KEY = 'colour-cluster-highscores-zset';

function normalizeName(value) {
  return String(value || 'Player').trim().slice(0, 12) || 'Player';
}

function normalizeScore(value) {
  const score = Number(value || 0);
  if (!Number.isFinite(score) || score < 0) return null;
  return Math.floor(score);
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

async function addScoreAtomic(name, score) {
  const member = JSON.stringify({
    name: normalizeName(name),
    t: Date.now(),
    r: Math.random().toString(36).slice(2, 8)
  });
  await kvFetch(`/zadd/${LEADERBOARD_KEY}/${score}/${encodeURIComponent(member)}`);
}

async function topScores(limit = 10) {
  const data = await kvFetch(`/zrevrange/${LEADERBOARD_KEY}/0/${Math.max(0, limit - 1)}/WITHSCORES`);
  const result = Array.isArray(data?.result) ? data.result : [];
  const rows = [];
  for (let i = 0; i < result.length; i += 2) {
    try {
      const parsed = JSON.parse(result[i]);
      const name = normalizeName(parsed?.name);
      const score = normalizeScore(result[i + 1]);
      if (score !== null) rows.push({ name, score });
    } catch {
      // ignore malformed member values
    }
  }
  return rows;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return res.status(200).json({ source: 'fallback', scores: [] });
      }
      const scores = await topScores(10);
      return res.status(200).json({ source: 'kv', scores });
    }

    if (req.method === 'POST') {
      const cleanScore = normalizeScore(req.body?.score);
      if (cleanScore === null) {
        return res.status(400).json({ error: 'invalid score' });
      }

      if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        return res.status(202).json({ source: 'fallback', accepted: true });
      }

      await addScoreAtomic(req.body?.name, cleanScore);
      const scores = await topScores(10);
      return res.status(200).json({ source: 'kv', scores });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch {
    return res.status(500).json({ error: 'server error' });
  }
}
