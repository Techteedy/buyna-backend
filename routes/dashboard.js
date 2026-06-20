const express = require('express');
const router = express.Router();
const { getDashboard } = require('../dashboard-data');
const { checkPinAccess } = require('./auth');

router.get('/api/dashboard/:phone', async (req, res) => {
  try {
    const phone = req.params.phone;
    const providedPin = req.headers['x-buyna-pin'];
    const allowed = await checkPinAccess(phone, providedPin);
    if (!allowed) return res.status(401).json({ error: 'PIN required' });

    const data = await getDashboard(phone);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load dashboard data' });
  }
});

module.exports = router;
