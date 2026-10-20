const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ================= GET ALL BOOKS (with search + filter + pagination) =================
router.get('/', async (req, res) => {
    try {
        const { search = '', category = '', sort = 'title', page = 1, limit = 12 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT b.*, c.category_name 
            FROM books b 
            LEFT JOIN categories c ON b.category_id = c.category_id
            WHERE (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)
        `;
        const params = [`%${search}%`, `%${search}%`, `%${search}%`];

        if (category) {
            query += ' AND b.category_id = ?';
            params.push(category);
        }

        const sortMap = {
            title: 'b.title ASC',
            newest: 'b.added_on DESC',
            rating: 'b.rating_avg DESC',
            available: 'b.available_copies DESC'
        };
        query += ` ORDER BY ${sortMap[sort] || 'b.title ASC'} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [books] = await db.query(query, params);

        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM books b WHERE (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)`,
            [`%${search}%`, `%${search}%`, `%${search}%`]
        );

        res.json({ success: true, books, total: countResult[0].total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching books.' });
    }
});

// ================= GET SINGLE BOOK WITH REVIEWS =================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [books] = await db.query(
            `SELECT b.*, c.category_name FROM books b LEFT JOIN categories c ON b.category_id = c.category_id WHERE b.book_id = ?`,
            [id]
        );
        if (books.length === 0) return res.status(404).json({ success: false, message: 'Book not found.' });

        const [reviews] = await db.query(
            `SELECT r.*, u.full_name FROM reviews r JOIN users u ON r.user_id = u.user_id WHERE r.book_id = ? ORDER BY r.created_at DESC`,
            [id]
        );

        res.json({ success: true, book: books[0], reviews });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching book details.' });
    }
});

// ================= UNIQUE FEATURE: RECOMMENDATIONS =================
// Recommends books from categories the user has borrowed most, excluding already-borrowed ones
router.get('/recommend/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [topCategories] = await db.query(
            `SELECT b.category_id, COUNT(*) as cnt FROM borrow_records br
             JOIN books b ON br.book_id = b.book_id
             WHERE br.user_id = ? GROUP BY b.category_id ORDER BY cnt DESC LIMIT 2`,
            [userId]
        );

        if (topCategories.length === 0) {
            const [popular] = await db.query(
                `SELECT b.*, c.category_name FROM books b LEFT JOIN categories c ON b.category_id = c.category_id 
                 ORDER BY b.rating_avg DESC LIMIT 6`
            );
            return res.json({ success: true, recommendations: popular, basis: 'popular' });
        }

        const categoryIds = topCategories.map(c => c.category_id);
        const [recommended] = await db.query(
            `SELECT b.*, c.category_name FROM books b LEFT JOIN categories c ON b.category_id = c.category_id
             WHERE b.category_id IN (?) AND b.book_id NOT IN 
             (SELECT book_id FROM borrow_records WHERE user_id = ?)
             ORDER BY b.rating_avg DESC LIMIT 6`,
            [categoryIds, userId]
        );

        res.json({ success: true, recommendations: recommended, basis: 'personalized' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error generating recommendations.' });
    }
});

// ================= UNIQUE FEATURE: EXTERNAL API - AUTO-FETCH BOOK DATA BY ISBN =================
// Uses Google Books API so the admin doesn't have to manually type description/cover
router.get('/external/isbn/:isbn', verifyToken, isAdmin, async (req, res) => {
    try {
        const { isbn } = req.params;
        const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);

        if (!response.data.items || response.data.items.length === 0) {
            return res.status(404).json({ success: false, message: 'No book found for this ISBN on Google Books.' });
        }

        const info = response.data.items[0].volumeInfo;
        res.json({
            success: true,
            data: {
                title: info.title || '',
                author: info.authors ? info.authors.join(', ') : '',
                publisher: info.publisher || '',
                published_year: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : null,
                description: info.description || '',
                cover_image: info.imageLinks ? info.imageLinks.thumbnail.replace('http://', 'https://') : ''
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error fetching data from Google Books API.' });
    }
});

// ================= ADD BOOK (Admin only) =================
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const { title, author, isbn, category_id, publisher, published_year, description, cover_image, total_copies, shelf_location } = req.body;

        if (!title || !author) {
            return res.status(400).json({ success: false, message: 'Title and author are required.' });
        }

        const [result] = await db.query(
            `INSERT INTO books (title, author, isbn, category_id, publisher, published_year, description, cover_image, total_copies, available_copies, shelf_location)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, author, isbn || null, category_id || null, publisher || null, published_year || null,
             description || null, cover_image || null, total_copies || 1, total_copies || 1, shelf_location || null]
        );

        res.status(201).json({ success: true, message: 'Book added successfully!', book_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error adding book. Check if ISBN already exists.' });
    }
});

// ================= UPDATE BOOK (Admin only) =================
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, author, isbn, category_id, publisher, published_year, description, cover_image, total_copies, shelf_location } = req.body;

        await db.query(
            `UPDATE books SET title=?, author=?, isbn=?, category_id=?, publisher=?, published_year=?, description=?, cover_image=?, total_copies=?, shelf_location=? WHERE book_id=?`,
            [title, author, isbn, category_id, publisher, published_year, description, cover_image, total_copies, shelf_location, id]
        );

        res.json({ success: true, message: 'Book updated successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error updating book.' });
    }
});

// ================= DELETE BOOK (Admin only) =================
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM books WHERE book_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Book deleted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error deleting book.' });
    }
});

// ================= GET ALL CATEGORIES =================
router.get('/meta/categories', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY category_name');
        res.json({ success: true, categories });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching categories.' });
    }
});

module.exports = router;
