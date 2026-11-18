# Abdullah Al Noman: portfolio

Static site (HTML, CSS, JS) with one Netlify Function that serves live
Admission Informer traffic from Cloudflare at `/api/stats`.

## Run locally

```bash
python3 -m http.server 8090
```

The live Cloudflare box stays hidden locally, because a plain static server
cannot run the function. To run the function too, use the Netlify CLI:

```bash
npx netlify dev
```

## Live Cloudflare stats: one-time setup

1. **Create a read-only token in Cloudflare.**
   Cloudflare dashboard → My Profile → API Tokens → Create Token →
   *Create Custom Token*. Give it read access to analytics:
   **Zone → Analytics → Read**, with Zone Resources set to
   **Include → Specific zone → admissioninformer.com**.
   If `/api/stats` later reports an authorization error, also add
   **Account → Account Analytics → Read** (Cloudflare's docs show this
   account-level permission for the GraphQL Analytics API). Copy the token.
2. **Copy the Zone ID.** Cloudflare dashboard → admissioninformer.com →
   Overview → right-hand column, "Zone ID".
3. **Add both to Netlify** (never commit them to the repo):
   Site configuration → Environment variables →
   - `CF_API_TOKEN` = the token
   - `CF_ZONE_ID` = the Zone ID
   - `STATS_DAYS` = `30` (optional; how many days to total)
4. **Redeploy.** Open `https://<your-site>/api/stats`; you should see JSON with
   `requests`, `visits` and `errorRate`.

If `/api/stats` returns an error, check the function log in Netlify
(Logs → Functions → stats). Cloudflare's own error message is logged there
and never sent to visitors.

## How the numbers behave

- Data comes from Cloudflare's `httpRequestsAdaptiveGroups` dataset, which
  Cloudflare keeps for at least 31 days on every plan. `STATS_DAYS` is capped
  at 30 for that reason.
- Some plans limit how wide a single query window can be, so the function asks
  for one-day windows (all in one request) and adds them up.
- Requests = all requests. Visits = Cloudflare's "visits" metric.
  5xx error rate = responses with status 500–599 ÷ all requests.
- Cached for an hour on Netlify's CDN, so Cloudflare is queried at most about
  once an hour regardless of traffic.
- If the function fails or is not configured, the live box stays hidden and
  only the fixed all-time figures show. No placeholder numbers are ever shown.
