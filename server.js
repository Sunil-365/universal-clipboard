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
app.use(express.static('public', { extensions: ['html'] }));

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
                        content: data.rawContent || data.content
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
app.use(express.urlencoded({ extended: true }));

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
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '18426025024-722mlcucv7tl8s28sue7dmc9djibkqht.apps.googleusercontent.com';
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
        
        // If request came from a full-page form redirect, return HTML to set localStorage and redirect to premium.html
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>Logging in...</title></head>
                <body>
                    <p style="text-align:center; font-family:sans-serif; margin-top:50px;">Completing login...</p>
                    <script>
                        localStorage.setItem('token', '${token}');
                        window.location.href = '/premium';
                    </script>
                </body>
                </html>
            `);
        }

        res.json({ token, user: { email: user.email, isPremium: user.isPremium } });
    } catch (err) {
        console.error("Google Auth Error:", err);
        if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
            return res.status(400).send("Authentication failed. Please try logging in again.");
        }
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
        
        const { customRoomId } = req.body;
        if (!customRoomId) return res.status(400).json({ error: "Room name required." });
        
        // Clean the custom room ID (letters and numbers only)
        const cleanRoomId = customRoomId.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanRoomId.length < 3) return res.status(400).json({ error: "Room name must be at least 3 alphanumeric characters." });

        // Check if room is already taken by someone else
        const existing = await User.findOne({ customRoomIds: cleanRoomId });
        if (existing && existing._id.toString() !== req.user.id) {
            return res.status(400).json({ error: "Room name already taken." });
        }

        let user = await User.findById(req.user.id);
        
        // Prevent exceeding limit
        if (user.customRoomIds.length >= 5) {
            return res.status(400).json({ error: "Maximum of 5 spaces allowed." });
        }
        
        // Add if not already present
        if (!user.customRoomIds.includes(cleanRoomId)) {
            user.customRoomIds.push(cleanRoomId);
            await user.save();
        }
        
        res.json({ message: "Room claimed successfully!", customRoomIds: user.customRoomIds });
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
        res.json({ customRoomIds: user.customRoomIds || [] });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Endpoint to delete a room
app.delete('/api/room/:roomId', authenticateToken, async (req, res) => {
    try {
        if (!req.user.isPremium) return res.status(403).json({ error: "Premium subscription required." });
        let user = await User.findById(req.user.id);
        user.customRoomIds = user.customRoomIds.filter(id => id !== req.params.roomId);
        await user.save();
        res.json({ success: true, customRoomIds: user.customRoomIds });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
// -----------------------
// --- Cashfree Payment Gateway & Settings ---
const { Cashfree, CFEnvironment } = require('cashfree-pg');

const axios = require('axios');
const cashfreeEnv = (process.env.CASHFREE_ENV || '').toUpperCase() === 'PRODUCTION' 
    ? 'PRODUCTION' 
    : 'SANDBOX';

const cashfreeBaseUrl = cashfreeEnv === 'PRODUCTION' 
    ? 'https://api.cashfree.com/pg' 
    : 'https://sandbox.cashfree.com/pg';

const cashfreeHeaders = {
    'x-client-id': process.env.CASHFREE_APP_ID,
    'x-client-secret': process.env.CASHFREE_SECRET_KEY,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json'
};

// 1. Create Subscription Plans (Run once to setup plans on Cashfree)
app.post('/api/payment/setup-plans', authenticateToken, async (req, res) => {
    try {
        const monthlyPlan = {
            plan_id: "premium_monthly_01",
            plan_name: "Premium Monthly",
            plan_type: "PERIODIC",
            plan_amount: 79.00,
            amount: 79.00,
            plan_max_amount: 500.00,
            plan_currency: "INR",
            currency: "INR",
            plan_interval_type: "MONTH",
            interval_type: "MONTH",
            plan_intervals: 1,
            intervals: 1,
            plan_max_cycles: 12,
            max_cycles: 12
        };
        const yearlyPlan = {
            plan_id: "premium_yearly_01",
            plan_name: "Premium Yearly",
            plan_type: "PERIODIC",
            plan_amount: 799.00,
            amount: 799.00,
            plan_max_amount: 2000.00,
            plan_currency: "INR",
            currency: "INR",
            plan_interval_type: "YEAR",
            interval_type: "YEAR",
            plan_intervals: 1,
            intervals: 1,
            plan_max_cycles: 5,
            max_cycles: 5
        };

        await axios.post(`${cashfreeBaseUrl}/plans`, monthlyPlan, { headers: cashfreeHeaders });
        await axios.post(`${cashfreeBaseUrl}/plans`, yearlyPlan, { headers: cashfreeHeaders });
        res.json({ success: true, message: "Plans created successfully" });
    } catch (err) {
        console.error("Plan creation error:", err.response ? err.response.data : err.message);
        res.status(500).json({ error: "Failed to setup plans" });
    }
});

// 2. Create Subscription Session (replaces PGCreateOrder)
app.post('/api/payment/create-session', authenticateToken, async (req, res) => {
    try {
        const { plan } = req.body; // 'monthly' or 'yearly'
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const subscriptionId = "sub_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        const planId = plan === 'yearly' ? 'premium_yearly_01' : 'premium_monthly_01';

        const request = {
            subscription_id: subscriptionId,
            plan_details: {
                plan_id: planId
            },
            customer_details: {
                customer_name: user.email.split('@')[0],
                customer_email: user.email,
                customer_phone: user.phone || "9999999999"
            },
            subscription_meta: {
                return_url: `${req.protocol}://${req.get('host')}/settings?sub_id=${subscriptionId}&status=success`,
                notification_channel: ["EMAIL", "SMS"]
            }
        };

        const response = await axios.post(`${cashfreeBaseUrl}/subscriptions`, request, { headers: cashfreeHeaders });
        
        // Return the Cashfree hosted checkout URL for authorization
        res.json({
            subscription_id: subscriptionId,
            checkout_url: response.data.subscription_session_id 
                ? `https://payments.cashfree.com/subscription/${response.data.subscription_session_id}` // Production
                : response.data.auth_url || `https://sandbox.cashfree.com/pg/view/subscription/${response.data.subscription_session_id}`
        });
    } catch (err) {
        const errorDetails = err.response ? err.response.data : err.message;
        console.error("Cashfree subscription error:", errorDetails);
        const userMsg = err.response?.data?.message || err.message || "Failed to initialize subscription";
        res.status(500).json({ error: userMsg });
    }
});

// 3. Webhook Listener for Subscription events
app.post('/api/webhooks/cashfree', express.json(), async (req, res) => {
    try {
        const event = req.body;
        console.log('Cashfree Webhook Event received:', event.type);

        // Handle successful new subscription mandate authorization
        if (event.type === 'SUBSCRIPTION_NEW' || event.type === 'SUBSCRIPTION_STATUS_CHANGE') {
            const customerEmail = event.data?.subscription?.customer_details?.customer_email || event.data?.customer_details?.customer_email;
            if (customerEmail && event.data?.subscription?.subscription_status === 'ACTIVE') {
                const user = await User.findOne({ email: customerEmail });
                if (user) {
                    user.isPremium = true;
                    user.subscriptionStatus = 'active';
                    user.subscriptionEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Add 30 days
                    await user.save();
                    console.log(`Updated user ${user.email} subscription status to active via webhook`);
                }
            }
        }

        // Handle recurring subscription charge success
        if (event.type === 'SUBSCRIPTION_CHARGE_SUCCESS' || event.type === 'SUBSCRIPTION_CHARGED') {
            const customerEmail = event.data?.subscription?.customer_details?.customer_email || event.data?.customer_details?.customer_email;
            if (customerEmail) {
                const user = await User.findOne({ email: customerEmail });
                if (user) {
                    user.isPremium = true;
                    user.subscriptionStatus = 'active';
                    user.subscriptionEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    await user.save();
                    console.log(`Renewed user ${user.email} via recurring webhook`);
                }
            }
        }

        res.status(200).send('Webhook Received');
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(500).send('Server Error');
    }
});

// 4. Get User Profile & Subscription Status
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Update Profile Details (Phone)
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { phone } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        if (phone !== undefined) user.phone = phone;
        await user.save();
        res.json({ message: "Profile updated successfully!", user: { email: user.email, phone: user.phone } });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 4. Change Password (for Local users)
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return res.status(400).json({ error: "All fields required" });

        const user = await User.findById(req.user.id);
        if (user.authProvider === 'google') {
            return res.status(400).json({ error: "Google authenticated accounts cannot change password here." });
        }

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(400).json({ error: "Incorrect current password" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: "Password updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
// -----------------------

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});