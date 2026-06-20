const express = require('express');
const router = express.Router();
const { getDashboard } = require('../dashboard-data');

router.get('/api/dashboard/:phone', async (req, res) => {
  try {
    const data = await getDashboard(req.params.phone);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load dashboard data' });
  }
});

module.exports = router;
