const express = require('express');
const router = express.Router();
const { parsePidgin } = require('../pidgin/parser');
const { handleIntent } = require('../pidgin/actions');
const { checkPinAccess } = require('./auth');

// The app does Speech-to-Text on-device, then POSTs the transcribed text here.
// Body: { phone: "2348012345678", text: "I sell 5 bag rice for 47000" }
router.post('/voice', async (req, res) => {
  const { phone, text } = req.body;
  if (!phone || !text) {
    return res.status(400).json({ error: 'phone and text are required' });
  }

  try {
    const providedPin = req.headers['x-buyna-pin'];
    const allowed = await checkPinAccess(phone, providedPin);
    if (!allowed) return res.status(401).json({ error: 'PIN required' });

    const parsed = parsePidgin(text);
    const { text: reply, data } = await handleIntent(phone, parsed, 'voice');

    res.json({
      intent: parsed.intent,
      parsed,
      reply,
      data: data || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong processing that.' });
  }
});

module.exports = router;
