const express = require('express');
const path = require('node:path');
const { initSchema } = require('./db');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Africa's Talking posts as form-encoded
app.use(express.static(path.join(__dirname, 'public'))); // serves the web demo frontend

app.use('/', require('./routes/voice'));
app.use('/', require('./routes/ussd'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/auth').router);
app.use('/', require('./routes/report'));

app.get('/status', (req, res) => {
  res.json({ status: 'BUYNA backend running', endpoints: ['/voice (POST)', '/ussd (POST)'] });
});

const PORT = process.env.PORT || 4000;

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`BUYNA backend listening on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });
