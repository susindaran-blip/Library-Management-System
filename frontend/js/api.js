// ============================================================
// SHARED UTILITIES — API calls, toasts, auth helpers
// ============================================================

const API_BASE = window.location.origin + '/api';

// ---------- TOKEN / USER HELPERS ----------
function getToken() { return localStorage.getItem('lms_token'); }
function getUser() {
    const u = localStorage.getItem('lms_user');
    return u ? JSON.parse(u) : null;
}
function saveSession(token, user) {
    localStorage.setItem('lms_token', token);
    localStorage.setItem('lms_user', JSON.stringify(user));
}
function clearSession() {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
}
function requireAuth() {
    if (!getToken()) window.location.href = 'index.html';
}
function requireAdmin() {
    const user = getUser();
    if (!getToken() || !user || user.role !== 'admin') window.location.href = 'index.html';
}

// ---------- API WRAPPER ----------
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong.');
        }
        return data;
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            throw new Error('Cannot connect to server. Make sure the backend is running.');
        }
        throw err;
    }
}

// ---------- TOAST NOTIFICATIONS ----------
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ---------- STAR RATING RENDER ----------
function renderStars(rating) {
    const rounded = Math.round(rating || 0);
    let stars = '';
    for (let i = 1; i <= 5; i++) stars += i <= rounded ? '★' : '☆';
    return stars;
}

// ---------- BACKGROUND ORBS (visual flair, injected on every page) ----------
function injectOrbs() {
    if (document.querySelector('.orb1')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="orb orb1"></div><div class="orb orb2"></div><div class="orb orb3"></div>`;
    document.body.prepend(...wrapper.children);
}
document.addEventListener('DOMContentLoaded', injectOrbs);
