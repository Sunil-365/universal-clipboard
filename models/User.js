const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: false // Optional for Google Sign-Up users
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    googleId: {
        type: String,
        sparse: true
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    subscriptionStatus: {
        type: String,
        enum: ['none', 'trial', 'active', 'cancelled'],
        default: 'none'
    },
    subscriptionPlan: {
        type: String,
        enum: ['monthly', 'yearly', null],
        default: null
    },
    trialEndsAt: {
        type: Date
    },
    subscriptionEndsAt: {
        type: Date
    },
    cashfreeSubscriptionId: {
        type: String
    },
    customRoomIds: {
        type: [String],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
