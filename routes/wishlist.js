const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// ================= GET MY WISHLIST =================
router.get('/', verifyToken, async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT w.*, b.title, b.author, b.cover_image, b.available_copies FROM wishlist w
             JOIN books b ON w.book_id = b.book_id WHERE w.user_id = ?`,
            [req.user.user_id]
        );
        res.json({ success: true, wishlist: items });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching wishlist.' });
    }
});

// ================= ADD TO WISHLIST =================
router.post('/:bookId', verifyToken, async (req, res) => {
    try {
        await db.query('INSERT IGNORE INTO wishlist (user_id, book_id) VALUES (?, ?)', [req.user.user_id, req.params.bookId]);
        res.json({ success: true, message: 'Added to wishlist!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error adding to wishlist.' });
    }
});

// ================= REMOVE FROM WISHLIST =================
router.delete('/:bookId', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM wishlist WHERE user_id=? AND book_id=?', [req.user.user_id, req.params.bookId]);
        res.json({ success: true, message: 'Removed from wishlist.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error removing from wishlist.' });
    }
});

module.exports = router;
