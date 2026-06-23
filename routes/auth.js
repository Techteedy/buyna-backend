const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { generateSalt, hashPin, verifyPin } = require('../pidgin/auth');

async function getUserAuth(phone) {
  const rows = await query(`SELECT pin_hash, pin_salt, recovery_word_hash, recovery_word_salt FROM users WHERE phone = $1`, [phone]);
  return rows[0] || null;
}

router.get('/api/auth/status/:phone', async (req, res) => {
  const user = await getUserAuth(req.params.phone);
  res.json({ hasPin: !!(user && user.pin_hash) });
});

router.post('/api/auth/set-pin', async (req, res) => {
  const { phone, pin, currentPin, recoveryWord } = req.body;
  if (!phone || !pin || !/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be 4-6 digits' });
  }

  await query(`INSERT INTO users (phone) VALUES ($1) ON CONFLICT (phone) DO NOTHING`, [phone]);
  const user = await getUserAuth(phone);

  // If a PIN already exists, the correct current PIN must be supplied to change it
  if (user && user.pin_hash) {
    if (!currentPin || !verifyPin(currentPin, user.pin_salt, user.pin_hash)) {
      return res.status(401).json({ error: 'Current PIN is incorrect' });
    }
  } else {
    // First-time setup — a recovery word is required so a forgotten PIN can be reset later
    if (!recoveryWord || recoveryWord.trim().length < 3) {
      return res.status(400).json({ error: 'A recovery word (at least 3 characters) is required when setting your first PIN' });
    }
  }

  const salt = generateSalt();
  const hash = hashPin(pin, salt);

  if (recoveryWord && recoveryWord.trim().length >= 3) {
    const recSalt = generateSalt();
    const recHash = hashPin(recoveryWord.trim().toLowerCase(), recSalt);
    await query(
      `UPDATE users SET pin_hash = $1, pin_salt = $2, recovery_word_hash = $3, recovery_word_salt = $4 WHERE phone = $5`,
      [hash, salt, recHash, recSalt, phone]
    );
  } else {
    await query(`UPDATE users SET pin_hash = $1, pin_salt = $2 WHERE phone = $3`, [hash, salt, phone]);
  }

  res.json({ success: true });
});

router.post('/api/auth/verify-pin', async (req, res) => {
  const { phone, pin } = req.body;
  const user = await getUserAuth(phone);
  if (!user || !user.pin_hash) return res.json({ valid: true }); // no PIN set yet — open access
  const valid = verifyPin(pin, user.pin_salt, user.pin_hash);
  res.json({ valid });
});

// Forgot your PIN — reset it using the recovery word set when the PIN was first created
router.post('/api/auth/reset-pin', async (req, res) => {
  const { phone, recoveryWord, newPin } = req.body;
  if (!newPin || !/^\d{4,6}$/.test(newPin)) {
    return res.status(400).json({ error: 'New PIN must be 4-6 digits' });
  }
  const user = await getUserAuth(phone);
  if (!user || !user.recovery_word_hash) {
    return res.status(400).json({ error: 'No recovery word was ever set for this account' });
  }
  const valid = verifyPin((recoveryWord || '').trim().toLowerCase(), user.recovery_word_salt, user.recovery_word_hash);
  if (!valid) return res.status(401).json({ error: 'Recovery word is incorrect' });

  const salt = generateSalt();
  const hash = hashPin(newPin, salt);
  await query(`UPDATE users SET pin_hash = $1, pin_salt = $2 WHERE phone = $3`, [hash, salt, phone]);
  res.json({ success: true });
});

// Reusable guard for other routes — call checkPinAccess(phone, providedPin) and check the result
async function checkPinAccess(phone, providedPin) {
  const user = await getUserAuth(phone);
  if (!user || !user.pin_hash) return true; // no PIN set yet — open access
  if (!providedPin) return false;
  return verifyPin(providedPin, user.pin_salt, user.pin_hash);
}

module.exports = { router, checkPinAccess };
