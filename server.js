const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' folder with clean URLs (.html extension mapping)
app.use(express.static('public', { extensions: ['html'] }));

// Catch-all route to serve index.html for undefined endpoints
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
    console.log(`Developer server running locally on http://localhost:${PORT}`);
});