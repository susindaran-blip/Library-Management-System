const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// ================= REGISTER =================
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, phone, role } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
        }

        // Check if user already exists
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const finalRole = role === 'admin' ? 'admin' : 'student'; // safety: only allow admin if explicitly passed (for setup)

        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [full_name, email, hashedPassword, phone || null, finalRole]
        );

        res.status(201).json({ success: true, message: 'Registration successful! Please login.', user_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// ================= LOGIN =================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required.' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'No account found with this email.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect password.' });
        }

        if (user.membership_status === 'suspended') {
            return res.status(403).json({ success: false, message: 'Your account is suspended. Contact admin.' });
        }

        const token = jwt.sign(
            { user_id: user.user_id, role: user.role, email: user.email, full_name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

module.exports = router;
