const crypto = require('node:crypto');

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPin(pin, salt) {
  return crypto.scryptSync(String(pin), salt, 64).toString('hex');
}

function verifyPin(pin, salt, expectedHash) {
  const actualHash = hashPin(pin, salt);
  // timing-safe comparison so response time can't leak how close a guess was
  const a = Buffer.from(actualHash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { generateSalt, hashPin, verifyPin };
