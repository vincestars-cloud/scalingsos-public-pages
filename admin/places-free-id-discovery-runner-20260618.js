const SUPABASE_URL = getSecret(['SCALINGSOS_SUPABASE_URL', 'SUPABASE_URL'], 'https://nnrjiywbmmumjhkkajwz.supabase.co').replace(/\/+$/, '');
const SUPABASE_KEY = getSecret(['SCALINGSOS_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_KEY'], '');
const GOOGLE_KEY = getSecret(['SCALINGSOS_GOOGLE_PLACES_API_KEY', 'GOOGLE_PLACES_API_KEY', 'GCP_PLACES_API_KEY'], '');
const CITY_DATA_URL = 'https://demo.scalingsos.com/admin/places-city-data-40k.json';
const SELF_WEBHOOK_URL = 'https://n8n.americanlifeteam.com/webhook/scalingsos-places-free-id-discovery';
const FIELD_MASK = 'places.id,nextPageToken';
const SOURCE = 'google_places_free_id_grid';

const INDUSTRY_TERMS = {
  cleaning: ['cleaning service', 'house cleaning', 'commercial cleaning', 'janitorial service', 'maid service', 'cleaners'],
  diesel_mechanic: ['diesel mechanic', 'mobile diesel mechanic', 'diesel repair', 'truck repair', 'heavy diesel repair'],
  electrical: ['electrician', 'electrical contractor', 'electrical repair', 'residential electrician', 'commercial electrician'],
  fencing: ['fence company', 'fence contractor', 'fence installation', 'fence repair', 'wood fence', 'vinyl fence', 'chain link fence'],
  flooring: ['flooring contractor', 'flooring company', 'floor installation', 'hardwood flooring', 'tile flooring'],
  funeral_home: ['funeral home', 'funeral services', 'cremation service', 'mortuary'],
  home_care: ['home care agency', 'senior home care', 'in home care', 'home health care', 'caregiver service'],
  hvac: ['hvac contractor', 'air conditioning repair', 'heating and cooling', 'hvac company', 'ac repair'],
  landscaping: ['landscaping company', 'lawn care service', 'landscaper', 'landscape contractor', 'yard maintenance', 'lawn mowing', 'landscape design'],
  mobile_mechanic: ['mobile mechanic', 'mobile auto repair', 'mobile car mechanic', 'auto repair mobile', 'mechanic near me'],
  mobile_truck_repair: ['mobile truck repair', 'mobile diesel truck repair', 'roadside truck repair', 'semi truck repair'],
  mold_remediation: ['mold remediation', 'mold removal', 'mold inspection', 'water damage restoration mold'],
  moving: ['moving company', 'movers', 'local movers', 'moving service', 'residential movers'],
  painting: ['painting contractor', 'house painter', 'painting company', 'interior painter', 'exterior painter'],
  pest_control: ['pest control', 'exterminator', 'pest control service', 'termite control'],
  plumbing: ['plumber', 'plumbing company', 'plumbing contractor', 'emergency plumber', 'drain cleaning'],
  remodeling: ['remodeling contractor', 'home remodeling', 'bathroom remodeler', 'kitchen remodeler', 'renovation contractor'],
  roofing: ['roofing company', 'roofing contractor', 'roofer', 'roof repair', 'roof replacement', 'metal roofing', 'gutter and roofing', 'storm damage roof repair'],
  septic_tank: ['septic tank service', 'septic pumping', 'septic company', 'septic repair', 'septic cleaning'],
  solar: ['solar installer', 'solar company', 'solar panel installation', 'residential solar'],
  therapy_counseling: ['therapy counseling', 'therapist', 'counseling services', 'mental health counselor', 'psychotherapy'],
  tree_repair: ['tree service', 'tree removal', 'tree trimming', 'arborist', 'stump grinding'],
  tree_service: ['tree service', 'tree removal', 'tree trimming', 'arborist', 'stump grinding']
};

function getSecret(names, fallback) {
  for (const name of names) {
    try {
      if (typeof __secrets !== 'undefined' && __secrets && __secrets[name]) return String(__secrets[name]);
    } catch (e) {}
    try {
      if (typeof $vars !== 'undefined' && $vars && $vars[name]) return String($vars[name]);
    } catch (e) {}
    try {
      if (typeof process !== 'undefined' && process.env && process.env[name]) return String(process.env[name]);
    } catch (e) {}
  }
  return fallback || '';
}
function norm(v) {
  return String(v || '').trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function arr(v) {
  if (Array.isArray(v)) return v.map(function (x) { return typeof x === 'object' ? (x.key || x.value || x.name || x.industry || '') : x; }).map(function (x) { return String(x || '').trim(); }).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  return [];
}
function rad(n) { return n * Math.PI / 180; }
function circleBbox(center, radiusKm) {
  const latDelta = radiusKm / 110.574;
  const lngDelta = radiusKm / Math.max(1, 111.320 * Math.cos(rad(center.lat)));
  return { south: center.lat - latDelta, north: center.lat + latDelta, west: center.lng - lngDelta, east: center.lng + lngDelta };
}
function rectCenter(rect) { return { lat: (rect.south + rect.north) / 2, lng: (rect.west + rect.east) / 2 }; }
function haversineKm(a, b) {
  const r = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * r * Math.asin(Math.sqrt(x));
}
function rectIntersectsCircle(rect, center, radiusKm) {
  const closest = { lat: Math.max(rect.south, Math.min(center.lat, rect.north)), lng: Math.max(rect.west, Math.min(center.lng, rect.east)) };
  return haversineKm(center, closest) <= radiusKm;
}
function rectanglePayload(rect) {
  return { low: { latitude: rect.south, longitude: rect.west }, high: { latitude: rect.north, longitude: rect.east } };
}
function cellId(areaLabel, depth, index, rect) {
  const c = rectCenter(rect);
  const slug = String(areaLabel || 'area').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42) || 'area';
  return slug + '-d' + depth + '-' + index + '-' + c.lat.toFixed(4) + '-' + c.lng.toFixed(4);
}
function createCellsForBbox(bbox, cellKm, areaLabel, circle) {
  const cells = [];
  let row = 0;
  for (let south = bbox.south; south < bbox.north - 1e-9;) {
    const north = Math.min(bbox.north, south + cellKm / 110.574);
    const midLat = (south + north) / 2;
    const lngStep = cellKm / Math.max(1, 111.320 * Math.cos(rad(midLat)));
    let col = 0;
    for (let west = bbox.west; west < bbox.east - 1e-9;) {
      const east = Math.min(bbox.east, west + lngStep);
      const rect = { south, west, north, east };
      if (!circle || rectIntersectsCircle(rect, circle.center, circle.radiusKm)) {
        cells.push({ id: cellId(areaLabel, 0, row + '_' + col, rect), rect, depth: 0, areaLabel: areaLabel });
      }
      west = east;
      col += 1;
    }
    south = north;
    row += 1;
  }
  return cells;
}
function splitCell(cell) {
  const r = cell.rect;
  const midLat = (r.south + r.north) / 2;
  const midLng = (r.west + r.east) / 2;
  const rects = [
    { south: r.south, west: r.west, north: midLat, east: midLng },
    { south: r.south, west: midLng, north: midLat, east: r.east },
    { south: midLat, west: r.west, north: r.north, east: midLng },
    { south: midLat, west: midLng, north: r.north, east: r.east }
  ];
  return rects.map(function (rect, i) {
    return { id: cellId(cell.areaLabel, cell.depth + 1, cell.id + '_' + i, rect), rect: rect, depth: cell.depth + 1, areaLabel: cell.areaLabel, parentId: cell.id };
  });
}
function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
function sbHeaders(prefer) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Content-Profile': 'scalingsos',
    'Accept-Profile': 'scalingsos',
    Prefer: prefer || 'resolution=merge-duplicates,return=representation'
  };
}
async function sbGet(path) {
  return await this.helpers.httpRequest({ method: 'GET', url: SUPABASE_URL + path, headers: sbHeaders('return=representation'), json: true, timeout: 20000 });
}
async function sbUpsert(path, rows, prefer) {
  if (!rows.length) return { saved: 0 };
  const chunks = [];
  for (let i = 0; i < rows.length; i += 250) chunks.push(rows.slice(i, i + 250));
  let saved = 0;
  const errors = [];
  for (const chunk of chunks) {
    try {
      await this.helpers.httpRequest({ method: 'POST', url: SUPABASE_URL + path, headers: sbHeaders(prefer || 'resolution=merge-duplicates,return=minimal'), body: chunk, json: true, timeout: 30000 });
      saved += chunk.length;
    } catch (e) {
      errors.push(String(e && e.message || e).slice(0, 500));
    }
  }
  return { saved: saved, errors: errors };
}
async function countRows(path) {
  try {
    const res = await this.helpers.httpRequest({ method: 'GET', url: SUPABASE_URL + path, headers: Object.assign({}, sbHeaders('count=exact'), { Range: '0-0' }), returnFullResponse: true, timeout: 15000 });
    const h = res && res.headers && (res.headers['content-range'] || res.headers['Content-Range']);
    return Number(String(h || '').split('/')[1] || 0);
  } catch (e) {
    return null;
  }
}
function buildPlan(cities, states, industries, opts) {
  const selectedStates = new Set(states.map(function (s) { return String(s || '').toUpperCase(); }));
  const selectedCities = cities.filter(function (c) { return selectedStates.has(String(c.state || '').toUpperCase()) && Number(c.population || 0) >= opts.minPopulation; });
  selectedCities.sort(function (a, b) { return Number(b.population || 0) - Number(a.population || 0) || String(a.city).localeCompare(String(b.city)); });
  const limitedCities = opts.maxCities > 0 ? selectedCities.slice(0, opts.maxCities) : selectedCities;
  const tasks = [];
  for (const city of limitedCities) {
    const center = { lat: Number(city.lat), lng: Number(city.lng) };
    if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) continue;
    const areaLabel = city.city + ' ' + city.state;
    const cells = createCellsForBbox(circleBbox(center, opts.cityRadiusKm), opts.cellKm, areaLabel, { center: center, radiusKm: opts.cityRadiusKm });
    for (const industry of industries) {
      const industryKey = norm(industry);
      const terms = (INDUSTRY_TERMS[industryKey] || [String(industry).replace(/_/g, ' ')]).slice(0, opts.maxTerms || 99);
      for (const term of terms) {
        for (const cell of cells) tasks.push({ city: city, areaLabel: areaLabel, industryKey: industryKey, industry: industry, term: term, cell: cell });
      }
    }
  }
  return { tasks: tasks, cities: limitedCities };
}
async function searchPage(term, cell, pageToken, pageSize) {
  const body = { textQuery: term, pageSize: pageSize, includePureServiceAreaBusinesses: true, locationRestriction: { rectangle: rectanglePayload(cell.rect) } };
  if (pageToken) body.pageToken = pageToken;
  return await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://places.googleapis.com/v1/places:searchText',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': FIELD_MASK },
    body: body,
    json: true,
    timeout: 45000
  });
}
async function queryCell(task, opts, depthState) {
  const records = [];
  const errors = [];
  let next = '';
  let total = 0;
  const pageCounts = [];
  for (let page = 0; page < opts.maxPages; page += 1) {
    try {
      const resp = await searchPage.call(this, task.term, task.cell, next, opts.pageSize);
      depthState.apiCalls += 1;
      const places = Array.isArray(resp && resp.places) ? resp.places : [];
      pageCounts.push(places.length);
      total += places.length;
      for (let i = 0; i < places.length; i += 1) {
        const p = places[i] || {};
        if (!p.id) continue;
        records.push({
          place_id: p.id,
          place_key: p.id,
          term: task.term,
          industry_key: task.industryKey,
          industry: task.industry,
          city: task.city.city,
          state: task.city.state,
          area_label: task.areaLabel,
          cell_id: task.cell.id,
          cell_depth: task.cell.depth,
          cell_rect: task.cell.rect,
          page: page + 1,
          rank: i + 1,
          page_counts: pageCounts.slice()
        });
      }
      next = String((resp && resp.nextPageToken) || '');
      if (!next || !places.length) break;
      await sleep(opts.pageDelayMs);
    } catch (e) {
      errors.push({ task: task.areaLabel + ' | ' + task.term + ' | ' + task.cell.id, error: String(e && e.message || e).slice(0, 500) });
      break;
    }
  }
  if (total >= opts.saturationThreshold && task.cell.depth < opts.maxDepth) {
    depthState.adaptiveSplits += 1;
    const children = splitCell(task.cell);
    for (const child of children) {
      const childResult = await queryCell.call(this, Object.assign({}, task, { cell: child }), opts, depthState);
      records.push.apply(records, childResult.records);
      errors.push.apply(errors, childResult.errors);
    }
  }
  return { records: records, errors: errors };
}
function summarize(records, limit) {
  const byArea = {}, byTerm = {}, seen = {};
  for (const r of records) {
    seen[r.place_id] = 1;
    for (const pair of [[byArea, r.area_label], [byTerm, r.term]]) {
      const map = pair[0], key = pair[1] || '';
      if (!key) continue;
      map[key] = map[key] || { label: key, raw_records: 0, unique: {}, terms: {}, sample_cell_rect: r.cell_rect };
      map[key].raw_records += 1;
      map[key].unique[r.place_id] = 1;
      map[key].terms[r.term] = 1;
    }
  }
  function finish(map) {
    return Object.keys(map).map(function (k) {
      const b = map[k];
      return { label: b.label, raw_records: b.raw_records, unique_places: Object.keys(b.unique).length, terms: Object.keys(b.terms).length, sample_cell_rect: b.sample_cell_rect };
    }).sort(function (a, b) { return b.unique_places - a.unique_places || b.raw_records - a.raw_records || a.label.localeCompare(b.label); }).slice(0, limit);
  }
  return { unique_places: Object.keys(seen).length, top_areas: finish(byArea), top_terms: finish(byTerm) };
}
async function status(jobId) {
  if (!jobId) return { ok: false, error: 'Missing job_id for status.' };
  const jobs = await sbGet.call(this, '/rest/v1/places_discovery_jobs?id=eq.' + encodeURIComponent(jobId) + '&select=*');
  const job = Array.isArray(jobs) && jobs[0] ? jobs[0] : null;
  const occurrenceCount = await countRows.call(this, '/rest/v1/places_discovery_occurrences?job_id=eq.' + encodeURIComponent(jobId) + '&select=id');
  const rawCount = await countRows.call(this, '/rest/v1/places_raw?last_discovery_job_id=eq.' + encodeURIComponent(jobId) + '&select=place_key');
  let sample = [];
  try {
    sample = await sbGet.call(this, '/rest/v1/places_discovery_occurrences?job_id=eq.' + encodeURIComponent(jobId) + '&select=search_term,city,state,raw&order=created_at.desc&limit=1000');
  } catch (e) {}
  const records = (sample || []).map(function (r) {
    const raw = r.raw || {};
    return { place_id: raw.google && raw.google.id ? raw.google.id : '', term: r.search_term || raw.search_term || '', area_label: raw.area_label || ((r.city || '') + ' ' + (r.state || '')).trim(), cell_rect: raw.cell_rect || null };
  }).filter(function (r) { return r.place_id; });
  return { ok: true, action: 'status', job_id: jobId, job: job, raw_unique_count: rawCount, occurrence_count: occurrenceCount, density_sample: summarize(records, 15) };
}

let __stage = 'start';
try {
  __stage = 'read_input';
  let input = {};
  if (typeof __payload !== 'undefined' && __payload) {
    input = __payload;
  } else {
    const inputItems = $input.all();
    input = inputItems && inputItems[0] && inputItems[0].json ? inputItems[0].json : {};
  }
  const body = input.body || input || {};
  __stage = 'parse_action';
  const action = String(body.action || body.mode || 'start').toLowerCase();
  if (action === 'status') {
    __stage = 'status';
    if (!SUPABASE_KEY) return [{ json: { ok: false, error: 'Missing n8n Supabase service-role environment/variable secret.', missing_supabase_key: true } }];
    return [{ json: await status.call(this, String(body.job_id || body.discovery_job_id || '')) }];
  }

  __stage = 'parse_filters';
  const states = arr(body.states || body.state).map(function (s) { return String(s).toUpperCase(); }).filter(Boolean);
  const industries = arr(body.industries || body.industry).map(norm).filter(Boolean);
  if (!states.length || !industries.length) return [{ json: { ok: false, error: 'Select at least one state and one industry.' } }];

  __stage = 'parse_options';
  const opts = {
    minPopulation: Math.max(40000, Number(body.min_city_population || body.min_population || 40000)),
    maxCities: Math.max(0, Number(body.max_cities || body.max_cities_per_run || 0)),
    maxTerms: Math.max(1, Math.min(12, Number(body.max_terms || body.max_terms_per_industry || 8))),
    cityRadiusKm: Math.max(5, Math.min(100, Number(body.city_radius_km || 35))),
    cellKm: Math.max(2, Math.min(50, Number(body.cell_km || 8))),
    pageSize: Math.max(1, Math.min(20, Number(body.page_size || 20))),
    maxPages: Math.max(1, Math.min(3, Number(body.max_pages || 3))),
    batchSize: Math.max(1, Math.min(150, Number(body.batch_size || body.max_searches || 25))),
    startOffset: Math.max(0, Number(body.start_offset || 0)),
    saturationThreshold: Math.max(20, Math.min(60, Number(body.saturation_threshold || 55))),
    maxDepth: Math.max(0, Math.min(3, Number(body.max_depth || 2))),
    pageDelayMs: Math.max(250, Math.min(3000, Number(body.page_delay_ms || 500))),
    autoContinue: body.auto_continue !== false,
    dryRun: action === 'dry_run' || body.dry_run === true
  };

  __stage = 'load_existing_job';
  const jobId = String(body.job_id || body.discovery_job_id || ('freeid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)));
  let existingJob = null;
  if (SUPABASE_KEY && !opts.dryRun) {
    try {
      const jobs = await sbGet.call(this, '/rest/v1/places_discovery_jobs?id=eq.' + encodeURIComponent(jobId) + '&select=*');
      existingJob = Array.isArray(jobs) && jobs[0] ? jobs[0] : null;
    } catch (e) {}
  }
  if (existingJob && Number(existingJob.next_offset || 0) > opts.startOffset) opts.startOffset = Number(existingJob.next_offset || 0);

  __stage = 'load_city_data';
  const cityData = await this.helpers.httpRequest({ method: 'GET', url: CITY_DATA_URL, json: true, timeout: 20000 });
  __stage = 'build_plan';
  const plan = buildPlan(Array.isArray(cityData && cityData.rows) ? cityData.rows : [], states, industries, opts);
  const total = plan.tasks.length;
  const start = Math.min(opts.startOffset, total);
  const end = Math.min(total, start + opts.batchSize);
  if (opts.dryRun) {
    return [{ json: { ok: true, action: 'dry_run', job_id: jobId, mode: 'discover-ids', field_mask: FIELD_MASK, states: states, industries: industries, selected_cities: plan.cities.length, total_queries: total, batch_start: start, batch_end: end, sample_task: plan.tasks[0] || null } }];
  }
  __stage = 'check_secrets';
  if (!SUPABASE_KEY || !GOOGLE_KEY) {
    return [{ json: { ok: false, error: 'Missing n8n environment/variable secrets for Google Places and/or Supabase service role.', missing_google_key: !GOOGLE_KEY, missing_supabase_key: !SUPABASE_KEY } }];
  }

  __stage = 'save_job_started';
  const jobBase = {
    id: jobId,
    status: start >= total ? 'completed' : 'running',
    states: states,
    industries: industries,
    cities: plan.cities.map(function (c) { return c.city + ' ' + c.state; }),
    min_city_population: opts.minPopulation,
    query_terms_mode: 'free_id_grid',
    batch_size: opts.batchSize,
    page_size: opts.pageSize,
    max_pages: opts.maxPages,
    total_queries: total,
    completed_queries: start,
    next_offset: start,
    params: { mode: 'discover-ids', field_mask: FIELD_MASK, city_radius_km: opts.cityRadiusKm, cell_km: opts.cellKm, max_terms: opts.maxTerms, max_depth: opts.maxDepth, source: SOURCE },
    updated_at: new Date().toISOString()
  };
  await sbUpsert.call(this, '/rest/v1/places_discovery_jobs?on_conflict=id', [jobBase], 'resolution=merge-duplicates,return=minimal');

  const selected = plan.tasks.slice(start, end);
  const depthState = { apiCalls: 0, adaptiveSplits: 0 };
  const allRecords = [];
  const errors = [];
  for (const task of selected) {
    const result = await queryCell.call(this, task, opts, depthState);
    allRecords.push.apply(allRecords, result.records);
    errors.push.apply(errors, result.errors);
  }
  const uniqueBatch = {};
  for (const r of allRecords) uniqueBatch[r.place_id] = r;
  const rawRows = Object.keys(uniqueBatch).map(function (id) {
    const r = uniqueBatch[id];
    return {
      place_key: id,
      place_id: id,
      business_name: null,
      phone: null,
      website: null,
      maps_url: 'https://www.google.com/maps/place/?q=place_id:' + encodeURIComponent(id),
      city: r.city,
      state: r.state,
      industry: r.industry_key,
      industry_key: r.industry_key,
      business_status: null,
      has_phone: false,
      has_website: false,
      first_discovery_job_id: jobId,
      last_discovery_job_id: jobId,
      updated_at: new Date().toISOString(),
      raw: { source: SOURCE, mode: 'discover-ids', google: { id: id }, search_term: r.term, area_label: r.area_label, cell_id: r.cell_id, cell_rect: r.cell_rect }
    };
  });
  const occurrenceRows = allRecords.map(function (r) {
    return {
      job_id: jobId,
      place_key: r.place_id,
      query_text: r.term + ' | ' + r.area_label + ' | ' + r.cell_id,
      execution_id: String($execution && $execution.id || ''),
      city: r.city,
      state: r.state,
      industry_key: r.industry_key,
      search_term: r.term,
      result_rank: r.rank,
      page_count: r.page,
      page_counts: r.page_counts || [],
      raw: { source: SOURCE, area_label: r.area_label, cell_id: r.cell_id, cell_depth: r.cell_depth, cell_rect: r.cell_rect, page: r.page, google: { id: r.place_id } }
    };
  });
  const rawSave = await sbUpsert.call(this, '/rest/v1/places_raw?on_conflict=place_key', rawRows, 'resolution=merge-duplicates,return=minimal');
  const occSave = await sbUpsert.call(this, '/rest/v1/places_discovery_occurrences?on_conflict=job_id,place_key,query_text', occurrenceRows, 'resolution=merge-duplicates,return=minimal');
  const density = summarize(allRecords, 20);
  const hasMore = end < total;
  const finalJob = {
    id: jobId,
    status: hasMore ? (errors.length ? 'running_with_errors' : 'running') : (errors.length ? 'completed_with_errors' : 'completed'),
    completed_queries: end,
    next_offset: end,
    batches_completed: Number(existingJob && existingJob.batches_completed || 0) + 1,
    places_seen: Number(existingJob && existingJob.places_seen || 0) + density.unique_places,
    last_error: errors.length ? errors[0].error : null,
    last_batch: { batch_start: start, batch_end: end, api_calls: depthState.apiCalls, raw_records: allRecords.length, unique_places: density.unique_places, raw_saved: rawSave.saved, occurrences_saved: occSave.saved, errors: errors.slice(0, 5), finished_at: new Date().toISOString(), density: density },
    updated_at: new Date().toISOString(),
    completed_at: hasMore ? null : new Date().toISOString()
  };
  await sbUpsert.call(this, '/rest/v1/places_discovery_jobs?on_conflict=id', [finalJob], 'resolution=merge-duplicates,return=minimal');
  await sbUpsert.call(this, '/rest/v1/places_discovery_job_events', [{
    job_id: jobId,
    event_type: hasMore ? 'batch_completed' : 'job_completed',
    batch_start: start,
    batch_end: end,
    total_queries: total,
    places_seen: density.unique_places,
    error: errors.length ? errors[0].error : null,
    meta: { api_calls: depthState.apiCalls, raw_records: allRecords.length, adaptive_splits: depthState.adaptiveSplits, raw_save: rawSave, occurrence_save: occSave, density: density }
  }], 'return=minimal');
  if (hasMore && opts.autoContinue) {
    try {
      await this.helpers.httpRequest({ method: 'POST', url: SELF_WEBHOOK_URL, headers: { 'Content-Type': 'application/json' }, body: { action: 'continue', job_id: jobId, start_offset: end, states: states, industries: industries, batch_size: opts.batchSize, min_city_population: opts.minPopulation, max_cities: opts.maxCities, max_terms: opts.maxTerms, city_radius_km: opts.cityRadiusKm, cell_km: opts.cellKm, page_size: opts.pageSize, max_pages: opts.maxPages, max_depth: opts.maxDepth, saturation_threshold: opts.saturationThreshold, auto_continue: true }, json: true, timeout: 1000 });
    } catch (e) {}
  }
  return [{ json: { ok: !errors.length, action: action, job_id: jobId, mode: 'discover-ids', field_mask: FIELD_MASK, paid_fields_requested: false, promote_prospects: false, states: states, industries: industries, selected_cities: plan.cities.length, total_queries: total, completed_queries: end, next_offset: end, has_more: hasMore, auto_continue: opts.autoContinue, api_calls: depthState.apiCalls, adaptive_splits: depthState.adaptiveSplits, raw_records: allRecords.length, unique_places_batch: density.unique_places, raw_saved: rawSave.saved, occurrences_saved: occSave.saved, top_areas: density.top_areas, top_terms: density.top_terms, errors: errors.slice(0, 5) } }];
} catch (e) {
  return [{ json: { ok: false, error: String(e && e.message || e).slice(0, 1000), stage: __stage, stack: String(e && e.stack || '').slice(0, 1500), action: 'free_id_discovery_failed' } }];
}
