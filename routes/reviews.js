const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// ================= ADD A REVIEW =================
router.post('/:bookId', verifyToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const { rating, review_text } = req.body;
        const userId = req.user.user_id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
        }

        await db.query(
            'INSERT INTO reviews (user_id, book_id, rating, review_text) VALUES (?, ?, ?, ?)',
            [userId, bookId, rating, review_text || '']
        );

        // Recalculate average rating for the book
        const [avgResult] = await db.query(
            'SELECT AVG(rating) as avg_rating FROM reviews WHERE book_id = ?',
            [bookId]
        );
        await db.query('UPDATE books SET rating_avg = ? WHERE book_id = ?', [avgResult[0].avg_rating, bookId]);

        res.status(201).json({ success: true, message: 'Review submitted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error submitting review.' });
    }
});

module.exports = router;
