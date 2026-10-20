const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ================= DASHBOARD STATS (Unique Feature: Analytics) =================
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
    try {
        const [[totalBooks]] = await db.query('SELECT COUNT(*) as cnt FROM books');
        const [[totalUsers]] = await db.query('SELECT COUNT(*) as cnt FROM users WHERE role="student"');
        const [[activeBorrows]] = await db.query('SELECT COUNT(*) as cnt FROM borrow_records WHERE status IN ("borrowed","overdue")');
        const [[overdueBooks]] = await db.query('SELECT COUNT(*) as cnt FROM borrow_records WHERE status="borrowed" AND due_date < CURDATE()');
        const [[totalFines]] = await db.query('SELECT COALESCE(SUM(fine_amount),0) as total FROM borrow_records');

        // Most borrowed books (top 5)
        const [topBooks] = await db.query(
            `SELECT b.title, COUNT(*) as borrow_count FROM borrow_records br
             JOIN books b ON br.book_id = b.book_id GROUP BY br.book_id ORDER BY borrow_count DESC LIMIT 5`
        );

        // Category distribution
        const [categoryDist] = await db.query(
            `SELECT c.category_name, COUNT(b.book_id) as book_count FROM categories c
             LEFT JOIN books b ON c.category_id = b.category_id GROUP BY c.category_id`
        );

        // Monthly borrow trend (last 6 months)
        const [monthlyTrend] = await db.query(
            `SELECT DATE_FORMAT(borrow_date, '%Y-%m') as month, COUNT(*) as count 
             FROM borrow_records 
             WHERE borrow_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
             GROUP BY month ORDER BY month`
        );

        res.json({
            success: true,
            stats: {
                totalBooks: totalBooks.cnt,
                totalUsers: totalUsers.cnt,
                activeBorrows: activeBorrows.cnt,
                overdueBooks: overdueBooks.cnt,
                totalFines: totalFines.total
            },
            topBooks,
            categoryDist,
            monthlyTrend
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching admin stats.' });
    }
});

// ================= GET ALL USERS =================
router.get('/users', verifyToken, isAdmin, async (req, res) => {
    try {
        const [users] = await db.query('SELECT user_id, full_name, email, role, membership_status, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching users.' });
    }
});

// ================= SUSPEND / ACTIVATE USER =================
router.put('/users/:id/status', verifyToken, isAdmin, async (req, res) => {
    try {
        const { status } = req.body; // 'active' or 'suspended'
        await db.query('UPDATE users SET membership_status = ? WHERE user_id = ?', [status, req.params.id]);
        res.json({ success: true, message: `User status updated to ${status}.` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating user status.' });
    }
});

module.exports = router;
