const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

const FINE_PER_DAY = 5; // ₹5 per day overdue
const BORROW_DAYS = 14; // 14 day borrowing period

// ================= BORROW A BOOK =================
router.post('/borrow/:bookId', verifyToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user.user_id;

        const [books] = await db.query('SELECT * FROM books WHERE book_id = ?', [bookId]);
        if (books.length === 0) return res.status(404).json({ success: false, message: 'Book not found.' });

        const book = books[0];

        // Prevent duplicate active borrow of same book by same user
        const [already] = await db.query(
            `SELECT * FROM borrow_records WHERE user_id=? AND book_id=? AND status IN ('borrowed','overdue')`,
            [userId, bookId]
        );
        if (already.length > 0) {
            return res.status(400).json({ success: false, message: 'You already have this book borrowed.' });
        }

        if (book.available_copies <= 0) {
            return res.status(400).json({ success: false, message: 'No copies available. You can join the waitlist instead.' });
        }

        const borrowDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + BORROW_DAYS);

        await db.query(
            'INSERT INTO borrow_records (user_id, book_id, borrow_date, due_date) VALUES (?, ?, ?, ?)',
            [userId, bookId, borrowDate, dueDate]
        );

        await db.query('UPDATE books SET available_copies = available_copies - 1 WHERE book_id = ?', [bookId]);

        await db.query(
            'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
            [userId, `You borrowed "${book.title}". Due on ${dueDate.toDateString()}.`, 'system']
        );

        res.json({ success: true, message: `Book borrowed! Due date: ${dueDate.toDateString()}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error borrowing book.' });
    }
});

// ================= RETURN A BOOK (with automatic fine calculation) =================
router.post('/return/:borrowId', verifyToken, async (req, res) => {
    try {
        const { borrowId } = req.params;
        const [records] = await db.query('SELECT * FROM borrow_records WHERE borrow_id = ?', [borrowId]);
        if (records.length === 0) return res.status(404).json({ success: false, message: 'Borrow record not found.' });

        const record = records[0];
        if (record.status === 'returned') {
            return res.status(400).json({ success: false, message: 'Book already returned.' });
        }

        const today = new Date();
        const dueDate = new Date(record.due_date);
        let fine = 0;

        if (today > dueDate) {
            const daysLate = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
            fine = daysLate * FINE_PER_DAY;
        }

        await db.query(
            'UPDATE borrow_records SET return_date=?, status="returned", fine_amount=? WHERE borrow_id=?',
            [today, fine, borrowId]
        );

        await db.query('UPDATE books SET available_copies = available_copies + 1 WHERE book_id = ?', [record.book_id]);

        // Notify next person in reservation queue (unique feature)
        const [nextInQueue] = await db.query(
            `SELECT * FROM reservations WHERE book_id=? AND status='waiting' ORDER BY queue_position ASC LIMIT 1`,
            [record.book_id]
        );
        if (nextInQueue.length > 0) {
            await db.query('UPDATE reservations SET status="notified" WHERE reservation_id=?', [nextInQueue[0].reservation_id]);
            await db.query(
                'INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)',
                [nextInQueue[0].user_id, 'A book you reserved is now available! Borrow it within 24 hours.', 'reservation']
            );
        }

        res.json({
            success: true,
            message: fine > 0 ? `Book returned. Overdue fine: ₹${fine}` : 'Book returned on time. No fine!',
            fine
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error returning book.' });
    }
});

// ================= GET MY BORROWED BOOKS =================
router.get('/my-books', verifyToken, async (req, res) => {
    try {
        const [records] = await db.query(
            `SELECT br.*, b.title, b.author, b.cover_image FROM borrow_records br
             JOIN books b ON br.book_id = b.book_id WHERE br.user_id = ? ORDER BY br.borrow_date DESC`,
            [req.user.user_id]
        );

        // Update overdue status dynamically for display
        const today = new Date();
        const updated = records.map(r => {
            if (r.status === 'borrowed' && new Date(r.due_date) < today) {
                r.status = 'overdue';
                const daysLate = Math.ceil((today - new Date(r.due_date)) / (1000*60*60*24));
                r.current_fine = daysLate * FINE_PER_DAY;
            } else {
                r.current_fine = r.fine_amount;
            }
            return r;
        });

        res.json({ success: true, records: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching borrowed books.' });
    }
});

// ================= JOIN RESERVATION WAITLIST (Unique Feature) =================
router.post('/reserve/:bookId', verifyToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user.user_id;

        const [existing] = await db.query(
            `SELECT * FROM reservations WHERE user_id=? AND book_id=? AND status IN ('waiting','notified')`,
            [userId, bookId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'You are already on the waitlist for this book.' });
        }

        const [queueCount] = await db.query(
            `SELECT COUNT(*) as cnt FROM reservations WHERE book_id=? AND status='waiting'`,
            [bookId]
        );
        const position = queueCount[0].cnt + 1;

        await db.query(
            'INSERT INTO reservations (user_id, book_id, queue_position) VALUES (?, ?, ?)',
            [userId, bookId, position]
        );

        res.json({ success: true, message: `You joined the waitlist! Your position: ${position}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error joining waitlist.' });
    }
});

// ================= ADMIN: GET ALL ACTIVE BORROWS =================
router.get('/all', verifyToken, isAdmin, async (req, res) => {
    try {
        const [records] = await db.query(
            `SELECT br.*, b.title, u.full_name, u.email FROM borrow_records br
             JOIN books b ON br.book_id = b.book_id
             JOIN users u ON br.user_id = u.user_id
             ORDER BY br.borrow_date DESC`
        );
        res.json({ success: true, records });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching all borrow records.' });
    }
});

module.exports = router;
