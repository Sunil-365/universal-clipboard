const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a specific room based on the QR code session ID
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Receive data from Device 2 and forward it to Device 1 in the same room
    socket.on('send-data', (data) => {
        // data contains { roomId, type: 'text'|'url', content: '...' }
        socket.to(data.roomId).emit('receive-data', data);
    });
});

// --- Feedback System ---
const fs = require('fs');
const path = require('path');
const REVIEWS_FILE = path.join(__dirname, 'reviews.json');

app.use(express.json());

// Helper to read reviews
function getReviews() {
    try {
        if (!fs.existsSync(REVIEWS_FILE)) return [];
        const data = fs.readFileSync(REVIEWS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading reviews:", err);
        return [];
    }
}

// GET all reviews
app.get('/api/reviews', (req, res) => {
    res.json(getReviews());
});

// POST a new anonymous review
app.post('/api/reviews', (req, res) => {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Review cannot be empty" });
    }

    const newReview = {
        id: Date.now().toString(),
        content: content.trim(),
        date: new Date().toISOString()
    };

    const reviews = getReviews();
    reviews.unshift(newReview); // Add to beginning

    // Keep only the last 100 reviews to avoid giant files on the free server
    if (reviews.length > 100) reviews.length = 100;

    try {
        fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
        res.status(201).json(newReview);
    } catch (err) {
        console.error("Error writing review:", err);
        res.status(500).json({ error: "Failed to save review" });
    }
});
// -----------------------

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});