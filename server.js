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

app.get('/sitemap.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    res.sendFile(path.join(__dirname, 'public/sitemap.xml'));
});
app.get('/robots.txt', (req, res) => {
    res.header('Content-Type', 'text/plain');
    res.sendFile(path.join(__dirname, 'public/robots.txt'));
});
app.get('/llms.txt', (req, res) => {
    res.header('Content-Type', 'text/plain');
    res.sendFile(path.join(__dirname, 'public/llms.txt'));
});
app.get('/llms-full.txt', (req, res) => {
    res.header('Content-Type', 'text/plain');
    res.sendFile(path.join(__dirname, 'public/llms-full.txt'));
});

// Catch-all route to serve index.html for undefined endpoints
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
    console.log(`Developer server running locally on http://localhost:${PORT}`);
});