require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require("socket.io");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('./models/User');
const Clip = require('./models/Clip');


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

const roomTimeouts = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a specific room based on the QR code session ID
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
        
        // If it's a new standard random room (Free Tier), set a 10 min timeout
        if (roomId && !roomId.startsWith('desk-')) { 
            if (!roomTimeouts[roomId]) {
                roomTimeouts[roomId] = setTimeout(() => {
                    io.to(roomId).emit('session-expired');
                    io.in(roomId).socketsLeave(roomId);
                    delete roomTimeouts[roomId];
                    console.log(`Room ${roomId} expired and destroyed.`);
                }, 10 * 60 * 1000); // 10 minutes
            }
        }
    });

    // Receive data from Device 2 and forward it to Device 1 in the same room
    socket.on('send-data', async (data) => {
        // data contains { roomId, type: 'text'|'url'|'file', content: '...', token?: '...' }
        socket.to(data.roomId).emit('receive-data', data);
        
        // History Log Integration
        if (data.token) {
            try {
                // Verify the JWT synchronously
                const decodedUser = jwt.verify(data.token, process.env.JWT_SECRET || 'fallback_secret_for_dev_mode');
                if (decodedUser && decodedUser.isPremium) {
                    const newClip = new Clip({
                        userId: decodedUser.id,
                        content: data.content
                    });
                    await newClip.save();
                }
            } catch (err) {
                console.error("Token verification failed for history log", err);
            }
        }
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

// --- Authentication Middleware & Routes ---
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_mode';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid or expired token." });
        req.user = user; 
        next();
    });
};

app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: "No credential provided" });

        if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
            return res.status(500).json({ error: "Google Sign-In is not configured on the server." });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, sub: googleId } = payload;

        if (!MONGODB_URI) return res.status(500).json({ error: "Database not configured" });

        let user = await User.findOne({ email });
        
        if (user) {
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            user = new User({ email, googleId, authProvider: 'google', isPremium: true });
            await user.save();
        }

        const token = jwt.sign({ id: user._id, email: user.email, isPremium: user.isPremium }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { email: user.email, isPremium: user.isPremium } });
    } catch (err) {
        console.error("Google Auth Error:", err);
        res.status(400).json({ error: "Invalid Google token" });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });
        if (!MONGODB_URI) return res.status(500).json({ error: "Database not configured" });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();
        
        const token = jwt.sign({ id: user._id, email: user.email, isPremium: user.isPremium }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { email: user.email, isPremium: user.isPremium } });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Server error during registration" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });
        if (!MONGODB_URI) return res.status(500).json({ error: "Database not configured" });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, email: user.email, isPremium: user.isPremium }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { email: user.email, isPremium: user.isPremium } });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error during login" });
    }
});

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/subscribe', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        
        user.isPremium = true;
        await user.save();
        
        const token = jwt.sign({ id: user._id, email: user.email, isPremium: user.isPremium }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: "Successfully subscribed to Premium!", token, user: { email: user.email, isPremium: true } });
    } catch (err) {
        res.status(500).json({ error: "Server error during subscription" });
    }
});
// --- Premium Clip History Routes ---
app.get('/api/clips', authenticateToken, async (req, res) => {
    try {
        if (!req.user.isPremium) return res.status(403).json({ error: "Premium subscription required." });
        const clips = await Clip.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(100);
        res.json(clips);
    } catch (err) {
        console.error("Error fetching clips:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/clips', authenticateToken, async (req, res) => {
    try {
        if (!req.user.isPremium) return res.status(403).json({ error: "Premium subscription required." });
        const { content } = req.body;
        if (!content || content.trim().length === 0) return res.status(400).json({ error: "Content cannot be empty" });
        
        const newClip = new Clip({
            userId: req.user.id,
            content: content.trim()
        });
        await newClip.save();
        res.status(201).json(newClip);
    } catch (err) {
        console.error("Error saving clip:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/clips/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user.isPremium) return res.status(403).json({ error: "Premium subscription required." });
        const clipId = req.params.id;
        
        const deletedClip = await Clip.findOneAndDelete({ _id: clipId, userId: req.user.id });
        if (!deletedClip) return res.status(404).json({ error: "Clip not found or unauthorized" });
        
        res.json({ message: "Clip deleted successfully" });
    } catch (err) {
        console.error("Error deleting clip:", err);
        res.status(500).json({ error: "Server error" });
    }
});
// -----------------------
// --- Advanced Freemium Features ---
// Endpoint for Custom Persistent Room Claim
app.post('/api/room/claim', authenticateToken, async (req, res) => {
    try {
        if (!req.user.isPremium) return res.status(403).json({ error: "Premium subscription required." });
        
        const { customRoomId, roomPin } = req.body;
        if (!customRoomId || !roomPin) return res.status(400).json({ error: "Room name and PIN required." });
        
        // Clean the custom room ID (letters and numbers only)
        const cleanRoomId = customRoomId.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanRoomId.length < 3) return res.status(400).json({ error: "Room name must be at least 3 alphanumeric characters." });

        // Check if room is already taken by someone else
        const existing = await User.findOne({ customRoomId: cleanRoomId });
        if (existing && existing._id.toString() !== req.user.id) {
            return res.status(400).json({ error: "Room name already taken." });
        }

        let user = await User.findById(req.user.id);
        user.customRoomId = cleanRoomId;
        user.roomPin = roomPin;
        await user.save();
        
        res.json({ message: "Room claimed successfully!", customRoomId: user.customRoomId });
    } catch (err) {
        console.error("Room claim error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// Endpoint to fetch current room status
app.get('/api/room', authenticateToken, async (req, res) => {
    try {
        if (!req.user.isPremium) return res.status(403).json({ error: "Premium subscription required." });
        let user = await User.findById(req.user.id);
        res.json({ customRoomId: user.customRoomId || null, hasPin: !!user.roomPin });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
// -----------------------

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});