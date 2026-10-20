const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// ================= GET MY NOTIFICATIONS =================
router.get('/', verifyToken, async (req, res) => {
    try {
        const [notifications] = await db.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
            [req.user.user_id]
        );
        const [unreadCount] = await db.query(
            'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [req.user.user_id]
        );
        res.json({ success: true, notifications, unread: unreadCount[0].cnt });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching notifications.' });
    }
});

// ================= MARK ALL AS READ =================
router.put('/mark-read', verifyToken, async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.user_id]);
        res.json({ success: true, message: 'Notifications marked as read.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating notifications.' });
    }
});

module.exports = router;
