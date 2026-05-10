const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    walletAddress: {
        type: String,
        default: ''
    },
    balance: {
        type: Number,
        default: 0
    },
    totalDeposit: {
        type: Number,
        default: 0
    },
    totalWithdraw: {
        type: Number,
        default: 0
    },
    totalProfit: {
        type: Number,
        default: 0
    },
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    referralComission: {
        type: Number,
        default: 0
    },
    level: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'diamond'],
        default: 'bronze'
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        default: ''
    },
    withdrawLockUntil: {
        type: Date,
        default: null
    },
    lastProfitDate: {
        type: Date,
        default: Date.now
    },
    joinDate: {
        type: Date,
        default: Date.now
    }
});

// Hash password before save
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Generate referral code
userSchema.pre('save', async function(next) {
    if (this.isNew && !this.referralCode) {
        this.referralCode = 'GFX' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    next();
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update level based on deposit
userSchema.methods.updateLevel = function() {
    if (this.totalDeposit >= 5000) this.level = 'diamond';
    else if (this.totalDeposit >= 2000) this.level = 'gold';
    else if (this.totalDeposit >= 500) this.level = 'silver';
    else this.level = 'bronze';
};

module.exports = mongoose.model('User', userSchema);
