const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Africa's Talking posts as form-encoded

app.use('/', require('./routes/voice'));
app.use('/', require('./routes/ussd'));

app.get('/', (req, res) => {
  res.json({ status: 'BUYNA backend running', endpoints: ['/voice (POST)', '/ussd (POST)'] });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`BUYNA backend listening on port ${PORT}`));
