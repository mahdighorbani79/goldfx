const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// صفحه ورود
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/user/dashboard');
    res.render('auth/login', { 
        title: 'ورود به GoldFX',
        error: null
    });
});

// صفحه ثبت‌نام
router.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/user/dashboard');
    res.render('auth/register', { 
        title: 'ثبت‌نام در GoldFX',
        error: null,
        referral: req.query.ref || ''
    });
});

// ثبت‌نام
router.post('/register', async (req, res) => {
    try {
        const { phone, password, password2, fullName, referral } = req.body;

        if (password !== password2) {
            return res.render('auth/register', {
                title: 'ثبت‌نام',
                error: 'رمز عبور و تکرار آن مطابقت ندارند',
                referral
            });
        }

        if (password.length < 6) {
            return res.render('auth/register', {
                title: 'ثبت‌نام',
                error: 'رمز عبور باید حداقل ۶ کاراکتر باشد',
                referral
            });
        }

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.render('auth/register', {
                title: 'ثبت‌نام',
                error: 'این شماره تلفن قبلاً ثبت شده است',
                referral
            });
        }

        const newUser = new User({
            phone,
            password,
            fullName: fullName || 'کاربر ' + phone.slice(-4)
        });

        // اگه با لینک رفرال اومده
        if (referral) {
            const referrer = await User.findOne({ referralCode: referral });
            if (referrer) {
                newUser.referredBy = referrer._id;
            }
        }

        await newUser.save();

        req.session.user = {
            id: newUser._id,
            phone: newUser.phone,
            fullName: newUser.fullName,
            balance: newUser.balance,
            level: newUser.level,
            isAdmin: newUser.isAdmin
        };

        res.redirect('/user/dashboard');
    } catch (err) {
        console.error(err);
        res.render('auth/register', {
            title: 'ثبت‌نام',
            error: 'خطایی رخ داد، دوباره تلاش کنید',
            referral: ''
        });
    }
});

// ورود
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        const user = await User.findOne({ phone });
        if (!user) {
            return res.render('auth/login', {
                title: 'ورود',
                error: 'شماره تلفن یا رمز عبور اشتباه است'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.render('auth/login', {
                title: 'ورود',
                error: 'شماره تلفن یا رمز عبور اشتباه است'
            });
        }

        req.session.user = {
            id: user._id,
            phone: user.phone,
            fullName: user.fullName,
            balance: user.balance,
            level: user.level,
            isAdmin: user.isAdmin
        };

        if (user.isAdmin) {
            return res.redirect('/admin/dashboard');
        }

        res.redirect('/user/dashboard');
    } catch (err) {
        console.error(err);
        res.render('auth/login', {
            title: 'ورود',
            error: 'خطایی رخ داد، دوباره تلاش کنید'
        });
    }
});

// خروج
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;
