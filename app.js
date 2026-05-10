// GoldFX Pro - Main Server
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const path = require('path');
const methodOverride = require('method-override');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== دیتابیس ==========
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goldfx', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ========== Middleware ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
    secret: process.env.JWT_SECRET || 'goldfx-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/goldfx'
    }),
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}));

// Rate Limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global Variables
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.path = req.path;
    next();
});

// ========== Routes ==========
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);

// Landing Page
app.get('/', (req, res) => {
    const Transaction = require('./models/Transaction');
    Transaction.find({ status: 'approved', type: 'deposit' })
        .sort({ date: -1 })
        .limit(10)
        .populate('userId', 'fullName')
        .then(transactions => {
            res.render('landing/index', { 
                title: 'GoldFX - سرمایه‌گذاری طلا',
                transactions
            });
        })
        .catch(() => {
            res.render('landing/index', { 
                title: 'GoldFX - سرمایه‌گذاری طلا',
                transactions: []
            });
        });
});

// 404
app.use((req, res) => {
    res.status(404).render('404', { title: 'صفحه پیدا نشد' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('500', { title: 'خطای سرور' });
});

// ========== Cron Job - سوددهی خودکار ==========
const cron = require('node-cron');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Festival = require('./models/Festival');

cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const festival = await Festival.findOne({ active: true });
        const profitPercent = festival ? festival.profitPercent : (process.env.DEFAULT_PROFIT_PERCENT || 10);

        const users = await User.find({ 
            balance: { $gt: 0 },
            lastProfitDate: { $lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
        });

        for (let user of users) {
            const profit = (user.balance * profitPercent) / 100;
            user.balance += profit;
            user.totalProfit += profit;
            user.lastProfitDate = now;
            await user.save();

            await Transaction.create({
                userId: user._id,
                type: 'profit',
                amount: profit,
                status: 'approved',
                description: `سود ${profitPercent}% روزانه`,
                date: now
            });

            console.log(`💰 سود ${profit} تتر به کاربر ${user.phone} واریز شد`);
        }
    } catch (err) {
        console.error('❌ Cron Error:', err);
    }
});

console.log('⏰ Cron Job فعال شد - هر ۲۴ ساعت سوددهی');

// ========== Start Server ==========
app.listen(PORT, () => {
    console.log(`🚀 GoldFX Server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
});
