module.exports = function handler(req, res) {
  res.status(200).json({
    status:  'ok',
    service: 'biomax-attendance',
    time:    new Date().toISOString(),
  });
};
