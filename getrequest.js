const { parseQuery } = require('./_helpers');

module.exports = function handler(req, res) {
  const { SN } = parseQuery(req.url);
  console.log(`[getrequest] SN=${SN} polling for commands`);
  // TODO: query a command_queue table and return pending commands here
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('OK');
};
