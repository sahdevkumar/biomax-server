const { getSupabase } = require('./_supabase');
const { parseQuery, isAllowedDevice, getRawBody, touchDevice, parseAttendanceLogs } = require('./_helpers');

module.exports = async function handler(req, res) {
  const q        = parseQuery(req.url);
  const serialNo = q['SN'] || '';
  const ip       = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  if (!serialNo) return res.status(400).send('ERROR: Missing SN');
  if (!isAllowedDevice(serialNo)) {
    console.warn(`[cdata] Rejected: ${serialNo}`);
    return res.status(403).send('ERROR: Forbidden');
  }

  const supabase = getSupabase();

  // ── GET: Device handshake ──────────────────────────────
  if (req.method === 'GET') {
    console.log(`[handshake] SN=${serialNo} IP=${ip}`);
    await touchDevice(supabase, serialNo, ip);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(
      `GET OPTION FROM: ${serialNo}\n` +
      `ATTLOGStamp=None\nOPERLOGStamp=9999\nATTPHOTOStamp=None\n` +
      `ErrorDelay=30\nDelay=10\nTransTimes=00:00;14:05\nTransInterval=1\n` +
      `TransFlag=TransData AttLog\nRealtime=1\nEncrypt=None\n` +
      `ServerVer=2.4.1 ${now}\n`
    );
  }

  // ── POST: Attendance push ─────────────────────────────
  if (req.method === 'POST') {
    const tableName = q['table'] || '';
    const rawBody   = await getRawBody(req);

    // Audit log
    await supabase.from('device_push_log').insert({
      serial_no: serialNo, table_name: tableName || null,
      raw_body: rawBody, ip_address: ip,
    });

    if (tableName === 'ATTLOG') {
      const deviceId = await touchDevice(supabase, serialNo, ip);
      const logs     = parseAttendanceLogs(rawBody, rawBody);
      if (logs.length > 0) {
        const { error } = await supabase
          .from('attendance_logs')
          .insert(logs.map(l => ({ ...l, device_id: deviceId })));
        if (error) {
          console.error('[push] insert error:', error.message);
          return res.status(500).send('ERROR');
        }
        console.log(`[push] ✓ ${logs.length} record(s) from ${serialNo}`);
      }
    }

    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('OK');
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).send('METHOD NOT ALLOWED');
};
