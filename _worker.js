/**
 * Centrix — Cloudflare Worker (Workers Assets model)
 *
 * This project deploys with `npx wrangler deploy` as a WORKER with static
 * assets — not as Cloudflare Pages. The `functions/` directory is never used.
 * All server-side code lives here.
 *
 * Routes:
 *   POST /api/assessment  → local economy analysis + Claude report
 *   GET  /api/probe?zip=  → raw data from each source (diagnostics)
 *   GET  /api/health      → binding check
 *   everything else       → static assets
 */

const MODEL = 'claude-sonnet-5';

// Census County Business Patterns vintage. CBP runs ~3 years behind.
const CBP_YEAR = '2022';
const ACS_YEAR = '2022';

/**
 * Consumer-facing NAICS sectors where a local producer could plausibly
 * compete. 3-digit level: granular enough to be useful, coarse enough to
 * avoid Census disclosure suppression at ZIP scale.
 */
const CATEGORIES = [
  { naics: '311', label: 'Food manufacturing (value-added food)' },
  { naics: '337', label: 'Furniture & cabinet making' },
  { naics: '339', label: 'Misc. manufacturing (crafts, sporting goods)' },
  { naics: '238', label: 'Specialty trade contractors' },
  { naics: '444', label: 'Building materials & garden supply' },
  { naics: '445', label: 'Grocery & food retail' },
  { naics: '448', label: 'Clothing & accessories' },
  { naics: '484', label: 'Trucking & local freight' },
  { naics: '541', label: 'Professional & technical services' },
  { naics: '561', label: 'Support services (cleaning, landscaping)' },
  { naics: '621', label: 'Health care practitioners' },
  { naics: '624', label: 'Social & child care services' },
  { naics: '713', label: 'Recreation & entertainment' },
  { naics: '722', label: 'Restaurants & food service' },
  { naics: '811', label: 'Repair & maintenance' },
  { naics: '812', label: 'Personal & laundry services' },
];

// Search radius by community type, in metres.
const RADIUS_BY_GEOGRAPHY = {
  urban: 3000,
  suburban: 6000,
  rural: 12000,
  remote: 20000,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/assessment') {
      if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
      if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
      return handleAssessment(request, env);
    }

    if (url.pathname === '/api/probe') {
      return handleProbe(url, env);
    }

    if (url.pathname === '/api/health') {
      return json({
        ok: true,
        worker: 'centrix',
        hasAnthropicKey: Boolean(env.ANTHROPIC_API_KEY),
        hasCensusKey: Boolean(env.CENSUS_API_KEY),
        assetsBound: Boolean(env.ASSETS),
        model: MODEL,
        cbpYear: CBP_YEAR,
      });
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};

/* ---------------------------------------------------------------- routes */

async function handleAssessment(request, env) {
  try {
    const answers = await request.json();

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'ANTHROPIC_API_KEY is not bound to this Worker.' }, 500);
    }

    // Local data is an enhancement, never a hard dependency. If the ZIP is
    // missing or a data source fails, we still produce a report.
    let local = null;
    let localError = null;
    const zip = normalizeZip(answers.zip);

    if (zip) {
      try {
        local = await analyzeLocalEconomy(zip, answers.geography, env);
      } catch (err) {
        localError = err.message;
      }
    }

    const report = await callClaude(
      env.ANTHROPIC_API_KEY,
      buildPrompt(answers, local)
    );

    return json({ report, local, localError });
  } catch (err) {
    return json({ error: err.message || 'Unknown error' }, 500);
  }
}

/**
 * Diagnostics. Hit /api/probe?zip=44011 in a browser to see exactly what each
 * upstream source returns from within the Worker runtime.
 */
async function handleProbe(url, env) {
  const zip = normalizeZip(url.searchParams.get('zip')) || '44011';
  const out = { zip, steps: {} };

  out.steps.geocode = await attempt(() => geocodeZip(zip));

  if (!env.CENSUS_API_KEY) {
    out.steps.census = { ok: false, error: 'CENSUS_API_KEY not bound' };
  } else {
    out.steps.censusLocal = await attempt(() => fetchCbpZip(zip, env));
    out.steps.censusNational = await attempt(() => fetchCbpNational(env));
    out.steps.population = await attempt(() => fetchZipPopulation(zip, env));
  }

  if (out.steps.geocode.ok) {
    const { lat, lon } = out.steps.geocode.value;
    out.steps.overpass = await attempt(() => fetchNearbyBusinesses(lat, lon, 6000));
  }

  return json(out);
}

async function attempt(fn) {
  try {
    const value = await fn();
    const preview = Array.isArray(value) ? value.slice(0, 8) : value;
    return { ok: true, count: Array.isArray(value) ? value.length : undefined, value: preview };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* ------------------------------------------------------- data collection */

function normalizeZip(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{5})/);
  return m ? m[1] : null;
}

/** ZIP → place name, state, lat/lon. Keyless. */
async function geocodeZip(zip) {
  const data = await cachedJson(`https://api.zippopotam.us/us/${zip}`, 86400 * 30);
  const place = data?.places?.[0];
  if (!place) throw new Error(`ZIP ${zip} not found`);
  return {
    zip,
    city: place['place name'],
    state: place['state'],
    stateAbbr: place['state abbreviation'],
    lat: Number(place.latitude),
    lon: Number(place.longitude),
  };
}

/** Establishment counts by NAICS for one ZIP. Requires a Census API key. */
async function fetchCbpZip(zip, env) {
  const url =
    `https://api.census.gov/data/${CBP_YEAR}/cbp` +
    `?get=NAICS2017,NAICS2017_LABEL,ESTAB&for=zip%20code:${zip}` +
    `&key=${env.CENSUS_API_KEY}`;
  return parseCensusRows(await cachedJson(url, 86400 * 14));
}

/** National establishment counts by NAICS — the comparison baseline. */
async function fetchCbpNational(env) {
  const url =
    `https://api.census.gov/data/${CBP_YEAR}/cbp` +
    `?get=NAICS2017,ESTAB&for=us:1&key=${env.CENSUS_API_KEY}`;
  return parseCensusRows(await cachedJson(url, 86400 * 30));
}

/** ZCTA population + median household income, plus the national figures. */
async function fetchZipPopulation(zip, env) {
  const base = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=B01003_001E,B19013_001E`;
  const [localRows, natRows] = await Promise.all([
    cachedJson(
      `${base}&for=zip%20code%20tabulation%20area:${zip}&key=${env.CENSUS_API_KEY}`,
      86400 * 30
    ),
    cachedJson(`${base}&for=us:1&key=${env.CENSUS_API_KEY}`, 86400 * 30),
  ]);

  const localPop = Number(localRows?.[1]?.[0]);
  const nationalPop = Number(natRows?.[1]?.[0]);
  if (!localPop || !nationalPop) throw new Error(`No population data for ZIP ${zip}`);

  return {
    population: localPop,
    medianIncome: numOrNull(localRows?.[1]?.[1]),
    nationalPopulation: nationalPop,
    nationalMedianIncome: numOrNull(natRows?.[1]?.[1]),
  };
}

/**
 * Named nearby businesses from OpenStreetMap. Best effort: OSM coverage of
 * small rural businesses is uneven, and Overpass allows only 2 concurrent
 * queries, so this must never block the report.
 */
async function fetchNearbyBusinesses(lat, lon, radius) {
  const query = `[out:json][timeout:20];
(
  nwr[shop](around:${radius},${lat},${lon});
  nwr[craft](around:${radius},${lat},${lon});
  nwr[amenity~"^(restaurant|cafe|bakery|fast_food|pub|bar|pharmacy|marketplace|veterinary)$"](around:${radius},${lat},${lon});
);
out tags center 400;`;

  const data = await cachedJson(
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    86400 * 7,
    20000
  );

  return (data?.elements || [])
    .map((el) => {
      const t = el.tags || {};
      return {
        name: t.name || null,
        kind: t.shop || t.craft || t.amenity || null,
        // A brand or wikidata-linked operator is a strong chain signal.
        chain: Boolean(t.brand || t['brand:wikidata'] || t['operator:wikidata']),
        brand: t.brand || t.operator || null,
      };
    })
    .filter((b) => b.name && b.kind);
}

/* ---------------------------------------------------------- the analysis */

/**
 * Compare local establishment density against the national norm to surface
 * likely leakage. See METHODOLOGY.md for the full write-up and caveats.
 */
async function analyzeLocalEconomy(zip, geography, env) {
  if (!env.CENSUS_API_KEY) {
    throw new Error('CENSUS_API_KEY is not bound to this Worker.');
  }

  const geo = await geocodeZip(zip);
  const radius = RADIUS_BY_GEOGRAPHY[geography] || 8000;

  const [localCbp, nationalCbp, pop, businesses] = await Promise.all([
    fetchCbpZip(zip, env),
    fetchCbpNational(env),
    fetchZipPopulation(zip, env),
    fetchNearbyBusinesses(geo.lat, geo.lon, radius).catch(() => null),
  ]);

  const per10k = (count, population) => (count / population) * 10000;
  const gaps = [];

  for (const cat of CATEGORIES) {
    const localEstab = lookupEstab(localCbp, cat.naics);
    const nationalEstab = lookupEstab(nationalCbp, cat.naics);
    if (nationalEstab === null) continue;

    // A suppressed or absent local row means "no establishments with paid
    // employees reported" — treat as zero, but flag it as suppressed.
    const suppressed = localEstab === null;
    const localCount = suppressed ? 0 : localEstab;

    const localDensity = per10k(localCount, pop.population);
    const nationalDensity = per10k(nationalEstab, pop.nationalPopulation);
    if (!nationalDensity) continue;

    const ratio = localDensity / nationalDensity;

    gaps.push({
      category: cat.label,
      naics: cat.naics,
      localEstablishments: localCount,
      localPer10k: round(localDensity, 2),
      nationalPer10k: round(nationalDensity, 2),
      ratio: round(ratio, 2),
      // Expected count if the area matched the national norm.
      impliedMissing: Math.max(
        0,
        Math.round(nationalDensity * (pop.population / 10000) - localCount)
      ),
      status: ratio < 0.6 ? 'under-served' : ratio > 1.4 ? 'saturated' : 'near national norm',
      suppressed,
    });
  }

  gaps.sort((a, b) => a.ratio - b.ratio);

  const chains = businesses ? businesses.filter((b) => b.chain) : [];
  const independents = businesses ? businesses.filter((b) => !b.chain) : [];

  return {
    place: `${geo.city}, ${geo.stateAbbr} ${zip}`,
    population: pop.population,
    medianIncome: pop.medianIncome,
    nationalMedianIncome: pop.nationalMedianIncome,
    searchRadiusKm: round(radius / 1000, 1),
    underServed: gaps.filter((g) => g.status === 'under-served').slice(0, 6),
    saturated: gaps.filter((g) => g.status === 'saturated').slice(0, 4),
    allGaps: gaps,
    businessSample: businesses
      ? {
          total: businesses.length,
          chains: chains.length,
          independents: independents.length,
          chainShare: businesses.length ? round(chains.length / businesses.length, 2) : null,
          topChains: dedupe(chains.map((c) => c.brand || c.name)).slice(0, 12),
          independentExamples: dedupe(independents.map((c) => c.name)).slice(0, 12),
        }
      : null,
    sources: {
      establishments: `US Census County Business Patterns ${CBP_YEAR} (ZIP level)`,
      population: `US Census ACS 5-Year ${ACS_YEAR} (ZCTA)`,
      businesses: businesses ? 'OpenStreetMap via Overpass API' : 'unavailable',
    },
  };
}

function lookupEstab(rows, naics) {
  const row = rows.find((r) => r.naics === naics);
  if (!row) return null;
  const n = Number(row.estab);
  return Number.isFinite(n) ? n : null;
}

/** Census returns [header, ...rows]. Normalize to objects. */
function parseCensusRows(raw) {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error('Unexpected Census response shape');
  }
  const header = raw[0];
  const iNaics = header.indexOf('NAICS2017');
  const iEstab = header.indexOf('ESTAB');
  const iLabel = header.indexOf('NAICS2017_LABEL');

  return raw.slice(1).map((r) => ({
    naics: r[iNaics],
    label: iLabel >= 0 ? r[iLabel] : null,
    estab: r[iEstab],
  }));
}

/* ------------------------------------------------------------ the prompt */

function buildPrompt(a, local) {
  const skillsDetail = a.skillsDetails || a.skills || 'unspecified';
  const region = a.region || local?.place || 'unspecified region';

  let dataSection;

  if (local) {
    const fmtGap = (g) =>
      `- ${g.category}: ${g.localEstablishments} locally (${g.localPer10k} per 10k residents) ` +
      `vs national ${g.nationalPer10k} per 10k. Ratio ${g.ratio}x. ` +
      `Matching the national rate would mean about ${g.impliedMissing} more establishment(s).`;

    const chainLine = local.businessSample
      ? `Of ${local.businessSample.total} mapped businesses within ${local.searchRadiusKm} km, ` +
        `${local.businessSample.chains} are chains and ${local.businessSample.independents} independent ` +
        `(chain share ${local.businessSample.chainShare}). ` +
        `Chains present: ${local.businessSample.topChains.join(', ') || 'none identified'}.`
      : 'Business-level mapping data was unavailable for this area.';

    dataSection = `
REAL LOCAL DATA for ${local.place} — cite these figures explicitly.

Population: ${local.population.toLocaleString()}
Median household income: ${local.medianIncome ? '$' + local.medianIncome.toLocaleString() : 'unavailable'} (national: ${local.nationalMedianIncome ? '$' + local.nationalMedianIncome.toLocaleString() : 'unavailable'})

UNDER-SERVED CATEGORIES (fewer establishments per capita than the national norm — likely leakage):
${local.underServed.map(fmtGap).join('\n') || 'None clearly under-served.'}

ALREADY SATURATED (avoid or differentiate sharply):
${local.saturated.map(fmtGap).join('\n') || 'None clearly saturated.'}

${chainLine}

Data sources: ${local.sources.establishments}; ${local.sources.population}; ${local.sources.businesses}.

MANDATORY HONESTY CONSTRAINTS — the credibility of this rests on them:
- Census CBP counts only establishments WITH PAID EMPLOYEES. Solo operators and
  side businesses are excluded, so an "empty" category may already have informal
  competitors. Say so where it matters.
- A neighbouring ZIP may serve this demand. Under-served does not automatically
  mean unmet — it means worth verifying on the ground.
- CBP data is from ${CBP_YEAR} and may lag current conditions.
- Do not invent business names, revenue figures, or demand estimates that are not
  in the data above. If you reason beyond the data, label it clearly as inference.`;
  } else {
    dataSection = `
No verified local data is available for this person (no ZIP provided, or the data
lookup failed). Reason from their described community type only. Do NOT fabricate
statistics, establishment counts, or specific local business names. Be explicit
that recommendations are general and should be validated locally.`;
  }

  return `You are a production & entrepreneurship advisor for Centrix, a movement focused on empowering citizens to produce and prosper locally.

Someone completed a Production Assessment. Write them a personalized, actionable report on building income in their local economy — grounded in the data below rather than generic advice.

THEIR PROFILE
- Location: ${region}
- Community type: ${a.geography}
- Skill category: ${a.skills}
- Specific skills: ${skillsDetail}
- Capital available: ${a.capital}
- Time commitment: ${a.time}
- Growth goal: ${a.growth}
- Competitive advantage: ${a.advantage}
${dataSection}

STRUCTURE THE REPORT AS
1. Personal Production Profile — 2-3 sentences with an encouraging, specific name for their path.
2. What Your Local Economy Is Missing — the leakage finding. Lead with the actual
   numbers. Explain plainly that when a category is under-served locally, residents
   are spending that money elsewhere, and the margin leaves the community.
3. Where You Fit — intersect the gaps with THEIR skills, capital, and time. Be
   honest if their strongest skill maps to a saturated category, and say what to do
   about it.
4. Two or three concrete production ideas — each tied to a specific data point,
   realistic for their capital and time, and fitting their growth goal.
5. First 30 Days Roadmap for the top idea — 3-5 concrete steps, including how to
   verify the gap is real before spending money.
6. Why This Is Centrix — 2-3 sentences on producing real value locally, building
   reputation, and keeping money in the community.

TONE: encouraging but realistic. Assume they are smart, skeptical, and short on
resources. Be specific about money, time, and effort. No platitudes. Never overstate
what the data proves.

OUTPUT: HTML only — <h3> headings, <p> paragraphs, <ul>/<li> lists, <strong> for key
figures. No markdown, no code fences, no preamble. Around 1100-1400 words.`;
}

/* --------------------------------------------------------------- Claude */

async function callClaude(apiKey, prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 5000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Claude API ${res.status}: ${raw.slice(0, 300)}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Claude API returned non-JSON: ${raw.slice(0, 200)}`);
  }

  // Collect every text block. Do not assume content[0] is text — a model may
  // emit thinking blocks or split the answer across several blocks.
  const blocks = Array.isArray(data?.content) ? data.content : [];
  const text = blocks
    .filter((b) => b?.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!text) {
    const shape = blocks.map((b) => b?.type).join(', ') || 'none';
    throw new Error(
      `No text block in response. stop_reason=${data?.stop_reason}; block types=[${shape}]`
    );
  }

  return text.replace(/^\s*```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '');
}

/* -------------------------------------------------------------- helpers */

/**
 * Fetch JSON through the Cloudflare edge cache. Upstream data changes yearly
 * at most, and Census/Overpass both rate limit, so caching is not optional.
 */
async function cachedJson(url, ttlSeconds, timeoutMs = 12000) {
  const cache = caches.default;
  const cacheKey = new Request(url, { method: 'GET' });

  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();

  const res = await fetch(url, {
    headers: { 'User-Agent': 'centrix-production-assessment/1.0' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`${new URL(url).hostname} returned ${res.status}: ${raw.slice(0, 160)}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`${new URL(url).hostname} returned non-JSON: ${raw.slice(0, 160)}`);
  }

  await cache.put(
    cacheKey,
    new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${ttlSeconds}`,
      },
    })
  );

  return data;
}

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function round(n, places) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function dedupe(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function json(data, status = 200) {
  return cors(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}
