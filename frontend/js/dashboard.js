// ============================================================
// STUDENT DASHBOARD LOGIC
// ============================================================
requireAuth();
const currentUser = getUser();
document.getElementById('welcome-msg').textContent = `Welcome, ${currentUser.full_name}!`;

// ---------------- TAB SWITCHING ----------------
const tabs = document.querySelectorAll('.tab-nav');
const tabPanels = {
    catalog: document.getElementById('tab-catalog'),
    mybooks: document.getElementById('tab-mybooks'),
    wishlist: document.getElementById('tab-wishlist'),
    recommend: document.getElementById('tab-recommend')
};

tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        Object.keys(tabPanels).forEach(key => {
            tabPanels[key].style.display = key === target ? 'block' : 'none';
        });
        if (target === 'mybooks') loadMyBooks();
        if (target === 'wishlist') loadWishlist();
        if (target === 'recommend') loadRecommendations();
    });
});

// ---------------- LOGOUT ----------------
document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
});

// ---------------- LOAD CATEGORIES ----------------
async function loadCategories() {
    try {
        const data = await apiCall('/books/meta/categories');
        const select = document.getElementById('category-filter');
        data.categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.category_id;
            opt.textContent = c.category_name;
            select.appendChild(opt);
        });
    } catch (err) { console.error(err); }
}

// ---------------- LOAD BOOK CATALOG ----------------
let searchTimeout;
async function loadCatalog() {
    const container = document.getElementById('book-grid-container');
    container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

    const search = document.getElementById('search-input').value;
    const category = document.getElementById('category-filter').value;
    const sort = document.getElementById('sort-filter').value;

    try {
        const data = await apiCall(`/books?search=${encodeURIComponent(search)}&category=${category}&sort=${sort}&limit=24`);
        if (data.books.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>No books found matching your search.</p></div>`;
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'book-grid';
        data.books.forEach((book, i) => grid.appendChild(createBookCard(book, i)));
        container.innerHTML = '';
        container.appendChild(grid);
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${err.message}</p></div>`;
    }
}

function createBookCard(book, index = 0) {
    const card = document.createElement('div');
    card.className = 'glass book-card';
    card.style.animationDelay = `${index * 0.04}s`;
    const coverUrl = book.cover_image || 'https://via.placeholder.com/220x240/4C1D95/ffffff?text=No+Cover';
    card.innerHTML = `
        <img src="${coverUrl}" class="book-cover" onerror="this.src='https://via.placeholder.com/220x240/4C1D95/ffffff?text=No+Cover'" alt="${book.title}">
        <div class="book-info">
            <h4>${book.title}</h4>
            <p>${book.author}</p>
            <div class="book-meta">
                <span class="stars">${renderStars(book.rating_avg)}</span>
                <span class="availability ${book.available_copies > 0 ? 'avail-yes' : 'avail-no'}">
                    ${book.available_copies > 0 ? book.available_copies + ' available' : 'Unavailable'}
                </span>
            </div>
        </div>
    `;
    card.addEventListener('click', () => openBookModal(book.book_id));
    return card;
}

document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadCatalog, 400);
});
document.getElementById('category-filter').addEventListener('change', loadCatalog);
document.getElementById('sort-filter').addEventListener('change', loadCatalog);

// ---------------- BOOK DETAIL MODAL ----------------
const bookModal = document.getElementById('book-modal');
document.getElementById('close-modal').addEventListener('click', () => bookModal.style.display = 'none');
bookModal.addEventListener('click', (e) => { if (e.target === bookModal) bookModal.style.display = 'none'; });

async function openBookModal(bookId) {
    bookModal.style.display = 'flex';
    document.getElementById('modal-body').innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    try {
        const data = await apiCall(`/books/${bookId}`);
        const book = data.book;
        const coverUrl = book.cover_image || 'https://via.placeholder.com/220x240/4C1D95/ffffff?text=No+Cover';

        document.getElementById('modal-body').innerHTML = `
            <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:20px;">
                <img src="${coverUrl}" style="width:150px; height:200px; object-fit:cover; border-radius:12px;" onerror="this.src='https://via.placeholder.com/150x200/4C1D95/ffffff?text=No+Cover'">
                <div style="flex:1; min-width:200px;">
                    <h2 style="margin-bottom:6px;">${book.title}</h2>
                    <p style="color:var(--text-muted); margin-bottom:10px;">by ${book.author}</p>
                    <p class="stars" style="font-size:18px;">${renderStars(book.rating_avg)} <span style="color:var(--text-muted); font-size:13px;">(${data.reviews.length} reviews)</span></p>
                    <p style="margin-top:10px; font-size:13px; color:var(--text-muted);">Category: ${book.category_name || 'N/A'} &nbsp;|&nbsp; Published: ${book.published_year || 'N/A'}</p>
                    <p style="margin-top:6px; font-size:13px; color:var(--text-muted);">Shelf: ${book.shelf_location || 'N/A'} &nbsp;|&nbsp;
                        <span class="availability ${book.available_copies > 0 ? 'avail-yes' : 'avail-no'}">${book.available_copies}/${book.total_copies} available</span>
                    </p>
                    <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
                        ${book.available_copies > 0
                            ? `<button class="btn btn-primary btn-sm" onclick="borrowBook(${book.book_id})">📖 Borrow Now</button>`
                            : `<button class="btn btn-secondary btn-sm" onclick="reserveBook(${book.book_id})">⏳ Join Waitlist</button>`}
                        <button class="btn btn-secondary btn-sm" onclick="addToWishlist(${book.book_id})">❤️ Wishlist</button>
                    </div>
                </div>
            </div>
            <p style="font-size:14px; line-height:1.6; color:var(--text-muted); margin-bottom:20px;">${book.description || 'No description available.'}</p>

            <h3 style="margin-bottom:12px; font-size:17px;">Write a Review</h3>
            <div class="star-input" id="star-input">
                ${[1,2,3,4,5].map(i => `<span data-val="${i}">★</span>`).join('')}
            </div>
            <div class="form-group"><textarea id="review-text" rows="2" placeholder="Share your thoughts about this book..."></textarea></div>
            <button class="btn btn-primary btn-sm" onclick="submitReview(${book.book_id})">Submit Review</button>

            <h3 style="margin:24px 0 12px; font-size:17px;">Reviews</h3>
            <div id="reviews-list">
                ${data.reviews.length === 0 ? '<p style="color:var(--text-muted); font-size:13px;">No reviews yet. Be the first!</p>' :
                data.reviews.map(r => `
                    <div style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.1);">
                        <strong style="font-size:13px;">${r.full_name}</strong>
                        <span class="stars" style="font-size:12px;">${renderStars(r.rating)}</span>
                        <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">${r.review_text || ''}</p>
                    </div>
                `).join('')}
            </div>
        `;

        // Star input interaction
        let selectedRating = 0;
        document.querySelectorAll('#star-input span').forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.val);
                document.querySelectorAll('#star-input span').forEach(s => {
                    s.classList.toggle('active', parseInt(s.dataset.val) <= selectedRating);
                });
            });
        });
        window.currentSelectedRating = () => selectedRating;
    } catch (err) {
        document.getElementById('modal-body').innerHTML = `<p>${err.message}</p>`;
    }
}

// ---------------- ACTIONS ----------------
async function borrowBook(bookId) {
    try {
        const data = await apiCall(`/borrow/borrow/${bookId}`, 'POST');
        showToast(data.message, 'success');
        bookModal.style.display = 'none';
        loadCatalog();
    } catch (err) { showToast(err.message, 'error'); }
}

async function reserveBook(bookId) {
    try {
        const data = await apiCall(`/borrow/reserve/${bookId}`, 'POST');
        showToast(data.message, 'success');
    } catch (err) { showToast(err.message, 'error'); }
}

async function addToWishlist(bookId) {
    try {
        const data = await apiCall(`/wishlist/${bookId}`, 'POST');
        showToast(data.message, 'success');
    } catch (err) { showToast(err.message, 'error'); }
}

async function submitReview(bookId) {
    const rating = window.currentSelectedRating ? window.currentSelectedRating() : 0;
    const review_text = document.getElementById('review-text').value;
    if (!rating) { showToast('Please select a star rating.', 'error'); return; }
    try {
        const data = await apiCall(`/reviews/${bookId}`, 'POST', { rating, review_text });
        showToast(data.message, 'success');
        openBookModal(bookId); // refresh modal
    } catch (err) { showToast(err.message, 'error'); }
}

async function returnBook(borrowId) {
    try {
        const data = await apiCall(`/borrow/return/${borrowId}`, 'POST');
        showToast(data.message, data.fine > 0 ? 'error' : 'success');
        loadMyBooks();
    } catch (err) { showToast(err.message, 'error'); }
}

// ---------------- MY BOOKS ----------------
async function loadMyBooks() {
    const tbody = document.getElementById('mybooks-tbody');
    tbody.innerHTML = '<tr><td colspan="6"><div class="loader"><div class="spinner"></div></div></td></tr>';
    try {
        const data = await apiCall('/borrow/my-books');
        if (data.records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="icon">📖</div><p>You haven't borrowed any books yet.</p></div></td></tr>`;
            return;
        }
        tbody.innerHTML = data.records.map(r => `
            <tr>
                <td>${r.title}<br><span style="color:var(--text-muted); font-size:11px;">${r.author}</span></td>
                <td>${new Date(r.borrow_date).toLocaleDateString()}</td>
                <td>${new Date(r.due_date).toLocaleDateString()}</td>
                <td><span class="status-pill status-${r.status}">${r.status}</span></td>
                <td>${r.current_fine > 0 ? '₹' + r.current_fine : '-'}</td>
                <td>${r.status !== 'returned' ? `<button class="btn btn-primary btn-sm" onclick="returnBook(${r.borrow_id})">Return</button>` : '✅'}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
    }
}

// ---------------- WISHLIST ----------------
async function loadWishlist() {
    const grid = document.getElementById('wishlist-grid');
    grid.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    try {
        const data = await apiCall('/wishlist');
        if (data.wishlist.length === 0) {
            grid.innerHTML = `<div class="empty-state"><div class="icon">❤️</div><p>Your wishlist is empty. Add books you'd like to read!</p></div>`;
            return;
        }
        grid.innerHTML = '';
        data.wishlist.forEach((item, i) => {
            const card = createBookCard({ ...item, book_id: item.book_id, rating_avg: 0 }, i);
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = `<p>${err.message}</p>`;
    }
}

// ---------------- RECOMMENDATIONS ----------------
async function loadRecommendations() {
    const grid = document.getElementById('recommend-grid');
    grid.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    try {
        const data = await apiCall(`/books/recommend/${currentUser.user_id}`);
        document.getElementById('recommend-basis').textContent =
            data.basis === 'personalized' ? 'Based on your borrowing history' : 'Popular picks to get you started';
        if (data.recommendations.length === 0) {
            grid.innerHTML = `<div class="empty-state"><div class="icon">✨</div><p>Borrow a few books so we can personalize recommendations!</p></div>`;
            return;
        }
        grid.innerHTML = '';
        data.recommendations.forEach((book, i) => grid.appendChild(createBookCard(book, i)));
    } catch (err) {
        grid.innerHTML = `<p>${err.message}</p>`;
    }
}

// ---------------- NOTIFICATIONS ----------------
const notifModal = document.getElementById('notif-modal');
document.getElementById('notif-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    notifModal.style.display = 'flex';
    try {
        const data = await apiCall('/notifications');
        const list = document.getElementById('notif-list');
        list.innerHTML = data.notifications.length === 0
            ? '<p style="color:var(--text-muted); font-size:13px;">No notifications yet.</p>'
            : data.notifications.map(n => `
                <div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.1); font-size:13px;">
                    ${n.message}
                    <div style="color:var(--text-muted); font-size:11px; margin-top:4px;">${new Date(n.created_at).toLocaleString()}</div>
                </div>
            `).join('');
        await apiCall('/notifications/mark-read', 'PUT');
        document.getElementById('notif-count').style.display = 'none';
    } catch (err) { console.error(err); }
});
document.getElementById('close-notif-modal').addEventListener('click', () => notifModal.style.display = 'none');
notifModal.addEventListener('click', (e) => { if (e.target === notifModal) notifModal.style.display = 'none'; });

async function checkNotifications() {
    try {
        const data = await apiCall('/notifications');
        if (data.unread > 0) {
            const badge = document.getElementById('notif-count');
            badge.textContent = data.unread;
            badge.style.display = 'inline-block';
        }
    } catch (err) { console.error(err); }
}

// ---------------- INIT ----------------
loadCategories();
loadCatalog();
checkNotifications();
