// ============================================================
// ADMIN PANEL LOGIC
// ============================================================
requireAdmin();

// ---------------- TAB SWITCHING ----------------
const tabs = document.querySelectorAll('.tab-nav');
const tabPanels = {
    overview: document.getElementById('tab-overview'),
    books: document.getElementById('tab-books'),
    borrows: document.getElementById('tab-borrows'),
    users: document.getElementById('tab-users')
};
tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        Object.keys(tabPanels).forEach(key => tabPanels[key].style.display = key === target ? 'block' : 'none');
        if (target === 'books') loadAdminBooks();
        if (target === 'borrows') loadAdminBorrows();
        if (target === 'users') loadAdminUsers();
    });
});

document.getElementById('logout-btn').addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
});

// ---------------- OVERVIEW / STATS ----------------
async function loadStats() {
    try {
        const data = await apiCall('/admin/stats');
        const s = data.stats;
        document.getElementById('stats-grid').innerHTML = `
            <div class="glass stat-card"><div class="icon">📚</div><div class="value">${s.totalBooks}</div><div class="label">Total Books</div></div>
            <div class="glass stat-card"><div class="icon">👥</div><div class="value">${s.totalUsers}</div><div class="label">Registered Members</div></div>
            <div class="glass stat-card"><div class="icon">📖</div><div class="value">${s.activeBorrows}</div><div class="label">Active Borrows</div></div>
            <div class="glass stat-card"><div class="icon">⏰</div><div class="value">${s.overdueBooks}</div><div class="label">Overdue Books</div></div>
            <div class="glass stat-card"><div class="icon">💰</div><div class="value">₹${s.totalFines}</div><div class="label">Fines Collected</div></div>
        `;

        // Top Books Chart
        new Chart(document.getElementById('topBooksChart'), {
            type: 'bar',
            data: {
                labels: data.topBooks.map(b => b.title.length > 18 ? b.title.slice(0,18)+'…' : b.title),
                datasets: [{ label: 'Times Borrowed', data: data.topBooks.map(b => b.borrow_count), backgroundColor: '#A78BFA', borderRadius: 8 }]
            },
            options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#CBD5E1' } }, y: { ticks: { color: '#CBD5E1' } } } }
        });

        // Category Distribution Chart
        new Chart(document.getElementById('categoryChart'), {
            type: 'doughnut',
            data: {
                labels: data.categoryDist.map(c => c.category_name),
                datasets: [{ data: data.categoryDist.map(c => c.book_count), backgroundColor: ['#7C3AED','#EC4899','#06B6D4','#10B981','#F59E0B','#EF4444','#8B5CF6','#F472B6'] }]
            },
            options: { plugins: { legend: { position: 'bottom', labels: { color: '#F8FAFC', font: { size: 11 } } } } }
        });

        // Monthly Trend Chart
        new Chart(document.getElementById('trendChart'), {
            type: 'line',
            data: {
                labels: data.monthlyTrend.map(m => m.month),
                datasets: [{ label: 'Books Borrowed', data: data.monthlyTrend.map(m => m.count), borderColor: '#06B6D4', backgroundColor: 'rgba(6,182,212,0.2)', fill: true, tension: 0.4 }]
            },
            options: { plugins: { legend: { labels: { color: '#F8FAFC' } } }, scales: { x: { ticks: { color: '#CBD5E1' } }, y: { ticks: { color: '#CBD5E1' } } } }
        });
    } catch (err) {
        document.getElementById('stats-grid').innerHTML = `<p>${err.message}</p>`;
    }
}

// ---------------- MANAGE BOOKS ----------------
async function loadAdminBooks() {
    const tbody = document.getElementById('admin-books-tbody');
    tbody.innerHTML = '<tr><td colspan="6"><div class="loader"><div class="spinner"></div></div></td></tr>';
    try {
        const search = document.getElementById('admin-search').value;
        const data = await apiCall(`/books?search=${encodeURIComponent(search)}&limit=100`);
        if (data.books.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">No books found.</td></tr>`;
            return;
        }
        tbody.innerHTML = data.books.map(b => `
            <tr>
                <td>${b.title}</td>
                <td>${b.author}</td>
                <td>${b.isbn || '-'}</td>
                <td>${b.available_copies}/${b.total_copies}</td>
                <td class="stars">${renderStars(b.rating_avg)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick='openEditBookModal(${JSON.stringify(b)})'>Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteBook(${b.book_id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
    }
}
document.getElementById('admin-search').addEventListener('input', () => {
    clearTimeout(window._searchTimeout);
    window._searchTimeout = setTimeout(loadAdminBooks, 400);
});

// ---------------- BOOK FORM MODAL ----------------
const bookFormModal = document.getElementById('book-form-modal');
document.getElementById('close-book-form').addEventListener('click', () => bookFormModal.style.display = 'none');

async function loadCategoryOptions() {
    try {
        const data = await apiCall('/books/meta/categories');
        const select = document.getElementById('f-category');
        select.innerHTML = '<option value="">Select category</option>' +
            data.categories.map(c => `<option value="${c.category_id}">${c.category_name}</option>`).join('');
    } catch (err) { console.error(err); }
}

function openAddBookModal() {
    document.getElementById('book-form-title').textContent = 'Add New Book';
    ['f-isbn','f-title','f-author','f-publisher','f-year','f-shelf','f-cover','f-description','f-book-id'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-copies').value = 1;
    document.getElementById('f-category').value = '';
    bookFormModal.style.display = 'flex';
}

function openEditBookModal(book) {
    document.getElementById('book-form-title').textContent = 'Edit Book';
    document.getElementById('f-book-id').value = book.book_id;
    document.getElementById('f-isbn').value = book.isbn || '';
    document.getElementById('f-title').value = book.title || '';
    document.getElementById('f-author').value = book.author || '';
    document.getElementById('f-category').value = book.category_id || '';
    document.getElementById('f-publisher').value = book.publisher || '';
    document.getElementById('f-year').value = book.published_year || '';
    document.getElementById('f-copies').value = book.total_copies || 1;
    document.getElementById('f-shelf').value = book.shelf_location || '';
    document.getElementById('f-cover').value = book.cover_image || '';
    document.getElementById('f-description').value = book.description || '';
    bookFormModal.style.display = 'flex';
}

async function fetchByISBN() {
    const isbn = document.getElementById('f-isbn').value.trim();
    if (!isbn) { showToast('Enter an ISBN first.', 'error'); return; }
    try {
        const data = await apiCall(`/books/external/isbn/${isbn}`);
        const d = data.data;
        document.getElementById('f-title').value = d.title;
        document.getElementById('f-author').value = d.author;
        document.getElementById('f-publisher').value = d.publisher;
        document.getElementById('f-year').value = d.published_year || '';
        document.getElementById('f-description').value = d.description;
        document.getElementById('f-cover').value = d.cover_image;
        showToast('Book details fetched from Google Books!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
}

async function saveBook() {
    const bookId = document.getElementById('f-book-id').value;
    const payload = {
        title: document.getElementById('f-title').value,
        author: document.getElementById('f-author').value,
        isbn: document.getElementById('f-isbn').value || null,
        category_id: document.getElementById('f-category').value || null,
        publisher: document.getElementById('f-publisher').value,
        published_year: document.getElementById('f-year').value || null,
        total_copies: document.getElementById('f-copies').value,
        shelf_location: document.getElementById('f-shelf').value,
        cover_image: document.getElementById('f-cover').value,
        description: document.getElementById('f-description').value
    };
    if (!payload.title || !payload.author) { showToast('Title and author are required.', 'error'); return; }

    try {
        const data = bookId
            ? await apiCall(`/books/${bookId}`, 'PUT', payload)
            : await apiCall('/books', 'POST', payload);
        showToast(data.message, 'success');
        bookFormModal.style.display = 'none';
        loadAdminBooks();
    } catch (err) { showToast(err.message, 'error'); }
}

async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book? This cannot be undone.')) return;
    try {
        const data = await apiCall(`/books/${bookId}`, 'DELETE');
        showToast(data.message, 'success');
        loadAdminBooks();
    } catch (err) { showToast(err.message, 'error'); }
}

// ---------------- BORROW RECORDS ----------------
async function loadAdminBorrows() {
    const tbody = document.getElementById('admin-borrows-tbody');
    tbody.innerHTML = '<tr><td colspan="6"><div class="loader"><div class="spinner"></div></div></td></tr>';
    try {
        const data = await apiCall('/borrow/all');
        if (data.records.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No borrow records yet.</td></tr>'; return; }
        tbody.innerHTML = data.records.map(r => `
            <tr>
                <td>${r.title}</td>
                <td>${r.full_name}<br><span style="color:var(--text-muted); font-size:11px;">${r.email}</span></td>
                <td>${new Date(r.borrow_date).toLocaleDateString()}</td>
                <td>${new Date(r.due_date).toLocaleDateString()}</td>
                <td><span class="status-pill status-${r.status}">${r.status}</span></td>
                <td>${r.fine_amount > 0 ? '₹' + r.fine_amount : '-'}</td>
            </tr>
        `).join('');
    } catch (err) { tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`; }
}

// ---------------- USERS ----------------
async function loadAdminUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    tbody.innerHTML = '<tr><td colspan="6"><div class="loader"><div class="spinner"></div></div></td></tr>';
    try {
        const data = await apiCall('/admin/users');
        tbody.innerHTML = data.users.map(u => `
            <tr>
                <td>${u.full_name}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td><span class="status-pill ${u.membership_status === 'active' ? 'status-returned' : 'status-overdue'}">${u.membership_status}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                    ${u.role !== 'admin' ? `<button class="btn btn-sm ${u.membership_status === 'active' ? 'btn-danger' : 'btn-primary'}" onclick="toggleUserStatus(${u.user_id}, '${u.membership_status}')">
                        ${u.membership_status === 'active' ? 'Suspend' : 'Activate'}
                    </button>` : '-'}
                </td>
            </tr>
        `).join('');
    } catch (err) { tbody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`; }
}

async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
        const data = await apiCall(`/admin/users/${userId}/status`, 'PUT', { status: newStatus });
        showToast(data.message, 'success');
        loadAdminUsers();
    } catch (err) { showToast(err.message, 'error'); }
}

// ---------------- INIT ----------------
loadStats();
loadCategoryOptions();
