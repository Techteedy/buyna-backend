const express = require('express');
const router = express.Router();
const db = require('../db');
const { parsePidgin } = require('../pidgin/parser');
const { handleIntent } = require('../pidgin/actions');

const MAIN_MENU =
  'CON Welcome to BUYNA\n' +
  '1. Record a sale\n' +
  '2. Hear today summary\n' +
  '3. Check Kolo balance\n' +
  '4. Check who owe you\n' +
  '5. Record an expense';

// Africa's Talking sends the FULL chain of inputs in `text`, separated by *
// e.g. first dial: text = "1"   then after typing details: text = "1*rice 5 5000"
router.post('/ussd', (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  const phone = phoneNumber || 'unknown';
  const input = (text || '').trim();

  res.set('Content-Type', 'text/plain');

  if (input === '') {
    return res.send(MAIN_MENU);
  }

  const parts = input.split('*');
  const choice = parts[0];
  const detail = parts[1];

  // Single-step options — answer immediately, no further input needed
  if (parts.length === 1) {
    if (choice === '2') {
      const { text: reply } = handleIntent(phone, { intent: 'DAILY_SUMMARY' }, 'ussd');
      return res.send(`END ${reply}`);
    }
    if (choice === '3') {
      const { text: reply } = handleIntent(phone, { intent: 'KOLO_BALANCE' }, 'ussd');
      return res.send(`END ${reply}`);
    }
    if (choice === '4') {
      const { text: reply } = handleIntent(phone, { intent: 'DEBT_QUERY' }, 'ussd');
      return res.send(`END ${reply}`);
    }
    if (choice === '1') {
      return res.send('CON Type your sale like this:\nitem qty price\nExample: rice 5 5000');
    }
    if (choice === '5') {
      return res.send('CON Type your expense like this:\ncategory amount\nExample: transport 500');
    }
    return res.send('END Invalid option. Dial *347# again.');
  }

  // Second-step options — we now have the typed detail
  if (choice === '1') {
    // detail format: "item qty price"
    const tokens = detail.trim().split(/\s+/);
    const price = tokens.pop();
    const qty = tokens.length > 1 ? tokens.pop() : '1';
    const item = tokens.join(' ') || 'goods';
    const sentence = `I sell ${qty} ${item} for ${price}`;
    const parsed = parsePidgin(sentence);
    const { text: reply } = handleIntent(phone, parsed, 'ussd');
    return res.send(`END ${reply}`);
  }

  if (choice === '5') {
    const tokens = detail.trim().split(/\s+/);
    const amount = tokens.pop();
    const category = tokens.join(' ') || 'other';
    const sentence = `I spend ${amount} on ${category}`;
    const parsed = parsePidgin(sentence);
    const { text: reply } = handleIntent(phone, parsed, 'ussd');
    return res.send(`END ${reply}`);
  }

  return res.send('END Something went wrong. Dial *347# again.');
});

module.exports = router;
