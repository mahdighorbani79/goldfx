const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Festival = require('../models/Festival');

// Middleware - بررسی ورود کاربر
function isLoggedIn(req, res, next) {
    if (!req.session.user) return res.redirect('/auth/login');
    next();
}

// Middleware - ادمین نباشه
function isNotAdmin(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) return res.redirect('/admin/dashboard');
    next();
}

router.use(isLoggedIn, isNotAdmin);

// ========== داشبورد کاربر ==========
router.get('/dashboard', async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const festival = await Festival.findOne({ active: true });

        // به‌روزرسانی session
        req.session.user.balance = user.balance;
        req.session.user.level = user.level;

        // آخرین تراکنش‌ها
        const recentTransactions = await Transaction.find({ userId: user._id })
            .sort({ date: -1 })
            .limit(10);

        // سود امروز
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayProfit = await Transaction.aggregate([
            { $match: { 
                userId: user._id, 
                type: 'profit', 
                status: 'approved',
                date: { $gte: todayStart }
            }},
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.render('user/dashboard', {
            title: 'داشبورد کاربری',
            user,
            festival,
            recentTransactions,
            todayProfit: todayProfit[0]?.total || 0
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// ========== صفحه واریز ==========
router.get('/deposit', async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('user/deposit', {
            title: 'واریز تتر',
            user
        });
    } catch (err) {
        res.redirect('/user/dashboard');
    }
});

// ثبت درخواست واریز
router.post('/deposit', async (req, res) => {
    try {
        const { amount, txHash } = req.body;
        const user = await User.findById(req.session.user.id);

        if (!amount || amount < 10) {
            return res.render('user/deposit', {
                title: 'واریز تتر',
                user,
                error: 'حداقل مبلغ واریز ۱۰ تتر می‌باشد'
            });
        }

        await Transaction.create({
            userId: user._id,
            type: 'deposit',
            amount: Number(amount),
            status: 'pending',
            txHash: txHash || '',
            description: 'درخواست واریز - در انتظار تأیید ادمین'
        });

        res.redirect('/user/deposit-history');
    } catch (err) {
        res.redirect('/user/deposit');
    }
});

// ========== تاریخچه واریز ==========
router.get('/deposit-history', async (req, res) => {
    try {
        const deposits = await Transaction.find({ 
            userId: req.session.user.id, 
            type: 'deposit' 
        }).sort({ date: -1 });

        res.render('user/deposit-history', {
            title: 'تاریخچه واریزها',
            deposits
        });
    } catch (err) {
        res.redirect('/user/dashboard');
    }
});

// ========== صفحه برداشت ==========
router.get('/withdraw', async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);

        if (user.withdrawLockUntil && user.withdrawLockUntil > new Date()) {
            const lockTime = new Date(user.withdrawLockUntil).toLocaleString('fa-IR');
            return res.render('user/withdraw', {
                title: 'برداشت تتر',
                user,
                error: `برداشت تا ${lockTime} قفل است`,
                success: null
            });
        }

        res.render('user/withdraw', {
            title: 'برداشت تتر',
            user,
            error: null,
            success: null
        });
    } catch (err) {
        res.redirect('/user/dashboard');
    }
});

// ثبت درخواست برداشت
router.post('/withdraw', async (req, res) => {
    try {
        const { amount, walletAddress } = req.body;
        const user = await User.findById(req.session.user.id);

        if (!amount || amount < 20) {
            return res.render('user/withdraw', {
                title: 'برداشت تتر',
                user,
                error: 'حداقل مبلغ برداشت ۲۰ تتر می‌باشد',
                success: null
            });
        }

        if (amount > user.balance) {
            return res.render('user/withdraw', {
                title: 'برداشت تتر',
                user,
                error: 'موجودی کافی نیست',
                success: null
            });
        }

        if (!walletAddress) {
            return res.render('user/withdraw', {
                title: 'برداشت تتر',
                user,
                error: 'آدرس کیف پول را وارد کنید',
                success: null
            });
        }

        await Transaction.create({
            userId: user._id,
            type: 'withdraw',
            amount: Number(amount),
            status: 'pending',
            walletAddress,
            description: 'درخواست برداشت - در انتظار تأیید ادمین'
        });

        res.render('user/withdraw', {
            title: 'برداشت تتر',
            user,
            error: null,
            success: 'درخواست برداشت با موفقیت ثبت شد'
        });
    } catch (err) {
        res.redirect('/user/withdraw');
    }
});

// ========== تاریخچه برداشت ==========
router.get('/withdraw-history', async (req, res) => {
    try {
        const withdraws = await Transaction.find({ 
            userId: req.session.user.id, 
            type: 'withdraw' 
        }).sort({ date: -1 });

        res.render('user/withdraw-history', {
            title: 'تاریخچه برداشت‌ها',
            withdraws
        });
    } catch (err) {
        res.redirect('/user/dashboard');
    }
});

// ========== تاریخچه سود ==========
router.get('/profit-history', async (req, res) => {
    try {
        const profits = await Transaction.find({ 
            userId: req.session.user.id, 
            type: 'profit',
            status: 'approved'
        }).sort({ date: -1 });

        res.render('user/profit-history', {
            title: 'تاریخچه سودها',
            profits
        });
    } catch (err) {
        res.redirect('/user/dashboard');
    }
});

// ========== رفرال ==========
router.get('/referral', async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        const referrals = await User.find({ referredBy: user._id });

        const referralLink = `${process.env.SITE_URL || 'http://localhost:3000'}/auth/register?ref=${user.referralCode}`;

        res.render('user/referral', {
            title: 'زیرمجموعه‌گیری',
            user,
            referrals,
            referralLink
        });
    } catch (err) {
        res.redirect('/user/dashboard');
    }
});

// ========== پروفایل ==========
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('user/profile', {
            title: 'پروفایل کاربری',
            user,
            error: null,
            success: null
        });
    } catch (err) {
        res.redirect('/user/dashboard');
    }
});

// ویرایش پروفایل
router.post('/profile', async (req, res) => {
    try {
        const { fullName, email, password, newPassword } = req.body;
        const user = await User.findById(req.session.user.id);

        user.fullName = fullName || user.fullName;
        user.email = email || user.email;

        if (password && newPassword) {
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.render('user/profile', {
                    title: 'پروفایل',
                    user,
                    error: 'رمز فعلی اشتباه است',
                    success: null
                });
            }
            user.password = newPassword;
            user.withdrawLockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }

        await user.save();
        req.session.user.fullName = user.fullName;

        res.render('user/profile', {
            title: 'پروفایل',
            user,
            error: null,
            success: 'تغییرات با موفقیت ذخیره شد'
        });
    } catch (err) {
        res.redirect('/user/profile');
    }
});

module.exports = router;
