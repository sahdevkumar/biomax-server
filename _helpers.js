function parseQuery(url = '') {
  const params = {};
  const idx = url.indexOf('?');
  if (idx === -1) return params;
  for (const part of url.slice(idx + 1).split('&')) {
    const [k, ...v] = part.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v.join('=') || '');
  }
  return params;
}

function isAllowedDevice(serialNo) {
  const allowed = (process.env.ALLOWED_SERIALS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  return allowed.length === 0 || allowed.includes(serialNo);
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk.toString(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function touchDevice(supabase, serialNo, ip) {
  const { data, error } = await supabase
    .from('devices')
    .upsert(
      { serial_no: serialNo, ip_address: ip, last_seen_at: new Date().toISOString() },
      { onConflict: 'serial_no' }
    )
    .select('id')
    .single();
  if (error) { console.error('[touchDevice]', error.message); return null; }
  return data?.id ?? null;
}

function parseAttendanceLogs(body, rawBody) {
  const lines = body.split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('SN=') && !l.startsWith('table='));
  const logs = [];
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 4) continue;
    const [userIdRaw, dateTimeRaw, inOutRaw, verifyRaw, workCodeRaw] = parts;
    const enrollNumber = parseInt(userIdRaw, 10);
    if (isNaN(enrollNumber)) continue;
    const d = new Date(dateTimeRaw?.trim().replace(' ', 'T'));
    if (isNaN(d.getTime())) continue;
    logs.push({
      enroll_number: enrollNumber,
      punched_at:    d.toISOString(),
      inout_mode:    parseInt(inOutRaw, 10) || 0,
      verify_mode:   parseInt(verifyRaw, 10) || 0,
      work_code:     workCodeRaw?.trim() || null,
      raw_payload:   rawBody,
    });
  }
  return logs;
}

module.exports = { parseQuery, isAllowedDevice, getRawBody, touchDevice, parseAttendanceLogs };
