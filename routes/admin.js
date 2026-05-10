const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Festival = require('../models/Festival');

// Middleware - فقط ادمین
function isAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.redirect('/auth/login');
    }
    next();
}

router.use(isAdmin);

// ========== داشبورد ادمین ==========
router.get('/dashboard', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ isAdmin: false });
        const totalDeposits = await Transaction.aggregate([
            { $match: { type: 'deposit', status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalWithdraws = await Transaction.aggregate([
            { $match: { type: 'withdraw', status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalProfits = await Transaction.aggregate([
            { $match: { type: 'profit', status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const pendingDeposits = await Transaction.countDocuments({ type: 'deposit', status: 'pending' });
        const pendingWithdraws = await Transaction.countDocuments({ type: 'withdraw', status: 'pending' });

        const recentUsers = await User.find({ isAdmin: false })
            .sort({ joinDate: -1 })
            .limit(10);

        const recentTransactions = await Transaction.find()
            .sort({ date: -1 })
            .limit(10)
            .populate('userId', 'phone fullName');

        const festival = await Festival.findOne({ active: true });

        res.render('admin/dashboard', {
            title: 'پنل مدیریت GoldFX',
            stats: {
                totalUsers,
                totalDeposits: totalDeposits[0]?.total || 0,
                totalWithdraws: totalWithdraws[0]?.total || 0,
                totalProfits: totalProfits[0]?.total || 0,
                pendingDeposits,
                pendingWithdraws
            },
            recentUsers,
            recentTransactions,
            festival
        });
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// ========== مدیریت کاربران ==========
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false }).sort({ joinDate: -1 });
        res.render('admin/users', {
            title: 'مدیریت کاربران',
            users
        });
    } catch (err) {
        res.redirect('/admin/dashboard');
    }
});

// مشاهده جزئیات کاربر
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.redirect('/admin/users');

        const transactions = await Transaction.find({ userId: user._id }).sort({ date: -1 });
        const referrals = await User.find({ referredBy: user._id });

        res.render('admin/user-detail', {
            title: `کاربر ${user.fullName}`,
            user,
            transactions,
            referrals
        });
    } catch (err) {
        res.redirect('/admin/users');
    }
});

// ویرایش موجودی کاربر
router.post('/users/:id/balance', async (req, res) => {
    try {
        const { balance } = req.body;
        await User.findByIdAndUpdate(req.params.id, { balance: Number(balance) });
        res.redirect(`/admin/users/${req.params.id}`);
    } catch (err) {
        res.redirect('/admin/users');
    }
});

// ========== مدیریت تراکنش‌ها ==========
router.get('/transactions', async (req, res) => {
    try {
        const filter = req.query.filter || 'all';
        let query = {};

        if (filter === 'pending') {
            query.status = 'pending';
        } else if (filter === 'deposit') {
            query.type = 'deposit';
        } else if (filter === 'withdraw') {
            query.type = 'withdraw';
        }

        const transactions = await Transaction.find(query)
            .sort({ date: -1 })
            .populate('userId', 'phone fullName');

        res.render('admin/transactions', {
            title: 'مدیریت تراکنش‌ها',
            transactions,
            filter
        });
    } catch (err) {
        res.redirect('/admin/dashboard');
    }
});

// تأیید تراکنش
router.post('/transactions/:id/approve', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.redirect('/admin/transactions');

        const user = await User.findById(transaction.userId);

        if (transaction.type === 'deposit') {
            user.balance += transaction.amount;
            user.totalDeposit += transaction.amount;
            user.updateLevel();
        } else if (transaction.type === 'withdraw') {
            if (user.balance < transaction.amount) {
                transaction.status = 'rejected';
                transaction.adminNote = 'موجودی ناکافی';
                await transaction.save();
                return res.redirect('/admin/transactions');
            }
            user.balance -= transaction.amount;
            user.totalWithdraw += transaction.amount;
        }

        transaction.status = 'approved';
        transaction.adminNote = req.body.note || 'تأیید توسط ادمین';
        await transaction.save();
        await user.save();

        // کمیسیون رفرال
        if (transaction.type === 'deposit' && user.referredBy) {
            const referrer = await User.findById(user.referredBy);
            if (referrer) {
                const comission = (transaction.amount * 5) / 100;
                referrer.balance += comission;
                referrer.referralComission += comission;
                await referrer.save();

                await Transaction.create({
                    userId: referrer._id,
                    type: 'referral',
                    amount: comission,
                    status: 'approved',
                    description: `کمیسیون از واریز ${user.fullName}`
                });
            }
        }

        res.redirect('/admin/transactions');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/transactions');
    }
});

// رد تراکنش
router.post('/transactions/:id/reject', async (req, res) => {
    try {
        await Transaction.findByIdAndUpdate(req.params.id, {
            status: 'rejected',
            adminNote: req.body.note || 'رد شده توسط ادمین'
        });
        res.redirect('/admin/transactions');
    } catch (err) {
        res.redirect('/admin/transactions');
    }
});

// ========== مدیریت جشنواره ==========
router.get('/festival', async (req, res) => {
    try {
        const festival = await Festival.findOne().sort({ createdAt: -1 });
        res.render('admin/festival', {
            title: 'مدیریت جشنواره',
            festival,
            success: null
        });
    } catch (err) {
        res.redirect('/admin/dashboard');
    }
});

// ایجاد/ویرایش جشنواره
router.post('/festival', async (req, res) => {
    try {
        const { active, title, occasion, profitPercent, endDate } = req.body;

        let festival = await Festival.findOne().sort({ createdAt: -1 });

        if (!festival) {
            festival = new Festival();
        }

        festival.active = active === 'on';
        festival.title = title;
        festival.occasion = occasion;
        festival.profitPercent = Number(profitPercent) || 40;
        festival.endDate = endDate ? new Date(endDate) : null;
        festival.createdBy = req.session.user.id;

        await festival.save();

        res.render('admin/festival', {
            title: 'مدیریت جشنواره',
            festival,
            success: 'جشنواره با موفقیت ذخیره شد'
        });
    } catch (err) {
        res.redirect('/admin/festival');
    }
});

// ========== تنظیمات ==========
router.get('/settings', async (req, res) => {
    try {
        const admin = await User.findById(req.session.user.id);
        res.render('admin/settings', {
            title: 'تنظیمات',
            admin,
            error: null,
            success: null
        });
    } catch (err) {
        res.redirect('/admin/dashboard');
    }
});

// تغییر رمز ادمین
router.post('/settings', async (req, res) => {
    try {
        const { currentPassword, newPassword, siteTitle } = req.body;
        const admin = await User.findById(req.session.user.id);

        if (currentPassword && newPassword) {
            const isMatch = await admin.comparePassword(currentPassword);
            if (!isMatch) {
                return res.render('admin/settings', {
                    title: 'تنظیمات',
                    admin,
                    error: 'رمز فعلی اشتباه است',
                    success: null
                });
            }
            admin.password = newPassword;
            await admin.save();
        }

        res.render('admin/settings', {
            title: 'تنظیمات',
            admin,
            error: null,
            success: 'تنظیمات ذخیره شد'
        });
    } catch (err) {
        res.redirect('/admin/settings');
    }
});

module.exports = router;
