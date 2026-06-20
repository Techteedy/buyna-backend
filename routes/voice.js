const express = require('express');
const router = express.Router();
const { parsePidgin } = require('../pidgin/parser');
const { handleIntent } = require('../pidgin/actions');

// The app does Speech-to-Text on-device, then POSTs the transcribed text here.
// Body: { phone: "2348012345678", text: "I sell 5 bag rice for 47000" }
router.post('/voice', (req, res) => {
  const { phone, text } = req.body;
  if (!phone || !text) {
    return res.status(400).json({ error: 'phone and text are required' });
  }

  const parsed = parsePidgin(text);
  const { text: reply, data } = handleIntent(phone, parsed, 'voice');

  res.json({
    intent: parsed.intent,
    parsed,
    reply,
    data: data || null,
  });
});

module.exports = router;
