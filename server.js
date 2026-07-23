const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' folder with clean URLs (.html extension mapping)
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Specific clean route handlers for instant reliable page navigation
app.get('/receiver', (req, res) => res.sendFile(path.join(__dirname, 'public/receiver.html')));
app.get('/sender', (req, res) => res.sendFile(path.join(__dirname, 'public/sender.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/premium', (req, res) => res.sendFile(path.join(__dirname, 'public/premium.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public/settings.html')));
app.get('/feedback', (req, res) => res.sendFile(path.join(__dirname, 'public/feedback.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'public/terms.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public/privacy.html')));
app.get('/refund', (req, res) => res.sendFile(path.join(__dirname, 'public/refund.html')));
app.get('/demo', (req, res) => res.sendFile(path.join(__dirname, 'public/demo.html')));

// Catch-all route to serve index.html for undefined endpoints
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Developer server running locally on http://localhost:${PORT}`);
});