const mongoose = require('mongoose');

const festivalSchema = new mongoose.Schema({
    active: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        default: 'جشنواره ویژه'
    },
    occasion: {
        type: String,
        default: ''
    },
    profitPercent: {
        type: Number,
        default: 40
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Festival', festivalSchema);
