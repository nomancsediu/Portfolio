// Live Admission Informer traffic from Cloudflare, served at /api/stats.
//
// The Cloudflare token stays on the server. The page only ever sees totals.
// Required environment variables (set them in Netlify, never in this file):
//   CF_API_TOKEN  an API token that can read analytics for the Admission Informer zone
//   CF_ZONE_ID    the Zone ID shown on the zone's Overview page in Cloudflare
// Optional:
//   STATS_DAYS    how many days back to total (default 30, max 30)
//
// Uses httpRequestsAdaptiveGroups, the dataset Cloudflare documents for every
// plan (at least 31 days of history). Some plans cap how wide one query window
// can be, so the range is split into one-day windows, all sent in a single
// GraphQL request using aliases.

const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
const DAY = 86400000;

export function buildQuery(days, now = new Date()) {
  // Whole UTC days ending now: [start of day (days-1) ago, now)
  const end = now;
  const startOfToday = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const windows = [];
  for (let i = days - 1; i >= 0; i--) {
    const from = new Date(startOfToday - i * DAY);
    const to = i === 0 ? end : new Date(startOfToday - (i - 1) * DAY);
    windows.push([from.toISOString(), to.toISOString()]);
  }
  const parts = windows.map(([from, to], i) => `
      d${i}: httpRequestsAdaptiveGroups(
        limit: 100
        filter: { datetime_geq: "${from}", datetime_lt: "${to}" }
      ) {
        count
        sum { visits }
        dimensions { edgeResponseStatus }
      }`);
  return {
    query: `query Stats($zoneTag: string!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {${parts.join('')}
    }
  }
}`,
    windows,
  };
}

// zone: { d0: [{count, sum:{visits}, dimensions:{edgeResponseStatus}}], d1: [...] }
export function summarise(zone, days) {
  let requests = 0;
  let visits = 0;
  let serverErrors = 0;
  for (const rows of Object.values(zone || {})) {
    for (const row of rows || []) {
      const n = row.count || 0;
      requests += n;
      visits += row.sum?.visits || 0;
      const status = row.dimensions?.edgeResponseStatus;
      if (status >= 500 && status <= 599) serverErrors += n;
    }
  }
  return {
    days,
    requests,
    visits,
    errorRate: requests ? serverErrors / requests : 0,
    updatedAt: new Date().toISOString(),
  };
}

const json = (body, status = 200, cache = true) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Browsers keep it 5 minutes; Netlify's CDN keeps it an hour, so Cloudflare
      // is queried at most about once an hour no matter how many people visit.
      'cache-control': cache ? 'public, max-age=300' : 'no-store',
      ...(cache ? { 'netlify-cdn-cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400' } : {}),
    },
  });

export default async function handler(_req, _ctx, deps = { fetch, env: process.env }) {
  const { CF_API_TOKEN, CF_ZONE_ID } = deps.env;
  // Adaptive data is kept for 31 days on every plan, so stay within 30.
  const days = Math.min(Math.max(parseInt(deps.env.STATS_DAYS || '30', 10) || 30, 1), 30);
  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    return json({ error: 'Stats are not configured on this deploy.' }, 503, false);
  }

  const { query } = buildQuery(days);
  let res;
  try {
    res = await deps.fetch(ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${CF_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables: { zoneTag: CF_ZONE_ID } }),
    });
  } catch {
    return json({ error: 'Could not reach Cloudflare.' }, 502, false);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.errors?.length) {
    // Log Cloudflare's message server-side for debugging; never send it to the page.
    console.error('Cloudflare analytics error', res.status, JSON.stringify(data?.errors || data));
    return json({ error: 'Cloudflare returned an error.' }, 502, false);
  }

  const zone = data.data?.viewer?.zones?.[0];
  if (!zone) return json({ error: 'Zone not found for this token.' }, 502, false);

  return json(summarise(zone, days));
}

export const config = { path: '/api/stats' };
