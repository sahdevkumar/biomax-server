const { parseQuery, getRawBody } = require('./_helpers');

module.exports = async function handler(req, res) {
  const { SN } = parseQuery(req.url);
  const body   = await getRawBody(req);
  console.log(`[devicecmd] ACK from SN=${SN}:`, body.slice(0, 100));
  // TODO: mark command as completed in command_queue table
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('OK');
};
