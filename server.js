require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require("socket.io");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Security Middleware ---
// 1. Helmet sets various secure HTTP headers. We disable CSP to allow inline scripts & CDNs.
app.use(helmet({ contentSecurityPolicy: false }));

// 2. Rate Limiting prevents brute-force / DDoS attacks.
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, 
    legacyHeaders: false,
});
app.use(limiter);

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
app.use(express.json());

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connected to MongoDB'))
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.warn('⚠️ MONGODB_URI is not defined in .env file. Feedback will not be saved.');
}

// Define Review Schema and Model
const reviewSchema = new mongoose.Schema({
    content: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

// GET all reviews
app.get('/api/reviews', async (req, res) => {
    try {
        if (!MONGODB_URI) return res.json([]);
        const reviews = await Review.find().sort({ date: -1 }).limit(100);
        res.json(reviews);
    } catch (err) {
        console.error("Error fetching reviews:", err);
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
});

// POST a new anonymous review
app.post('/api/reviews', async (req, res) => {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Review cannot be empty" });
    }

    if (!MONGODB_URI) {
        return res.status(500).json({ error: "Database not configured. Please add MONGODB_URI to .env" });
    }

    try {
        const newReview = new Review({
            content: content.trim(),
            date: new Date()
        });
        await newReview.save();
        res.status(201).json(newReview);
    } catch (err) {
        console.error("Error saving review:", err);
        res.status(500).json({ error: "Failed to save review" });
    }
});
// -----------------------

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});