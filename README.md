# Library-Management-System
# 📚 LibroVerse — Library Management System
Full-stack project: **Node.js + Express + MySQL + HTML/CSS/JS (Chart.js)**

Unique features included (for viva/demo talking points):
1. **Smart Recommendations** — suggests books based on each student's borrowing history/category
2. **Google Books API integration** — admin types an ISBN and title/author/cover/description auto-fill
3. **Reservation waitlist queue** — when a book is unavailable, students join a queue and get notified when it's free
4. **Automatic fine calculation** — ₹5/day overdue, calculated live
5. **Reviews & star ratings** — average rating recalculated automatically
6. **Wishlist**
7. **In-app notifications**
8. **Admin analytics dashboard** — Chart.js graphs: most borrowed books, category distribution, monthly trend
9. **Glassmorphism UI** with animated gradient background, floating orbs, toasts, modals

---

## STEP 1 — Install prerequisites (do this first, tonight if possible)

1. Install **Node.js** (v18+): https://nodejs.org (LTS version) — verify with:
   ```
   node -v
   npm -v
   ```
2. You already have **MySQL Workbench 8.0** — good, that's all you need for the database (no separate MySQL Server install needed if Workbench installed it together; if you get connection errors, install "MySQL Server 8.0" from https://dev.mysql.com/downloads/mysql/ too).

---

## STEP 2 — Set up the database in MySQL Workbench

1. Open **MySQL Workbench** → connect to your local instance (usually `root` user, the password you set during install).
2. Click **File → Open SQL Script** → select `database/schema.sql` from this project.
3. Click the ⚡ **lightning bolt icon** (Execute) to run the ENTIRE script.
4. This will:
   - Create database `library_management`
   - Create all tables: `users`, `categories`, `books`, `borrow_records`, `reservations`, `reviews`, `notifications`, `wishlist`
   - Insert 8 sample categories and 8 sample books
5. Confirm it worked: in the left sidebar, refresh **Schemas**, expand `library_management` → `Tables` → you should see 8 tables. Run:
   ```sql
   SELECT * FROM books;
   ```
   You should see 8 rows.

**Important:** Note your MySQL **root password** — you'll need it in Step 3.

---

## STEP 3 — Configure and run the backend

1. Open a terminal in the project folder → go into `backend`:
   ```
   cd library-management-system/backend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create your environment file: copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
   (On Windows: `copy .env.example .env`)
4. Open `.env` and edit these two lines with YOUR MySQL Workbench credentials:
   ```
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   ```
   Leave everything else as-is.
5. Start the server:
   ```
   npm start
   ```
6. You should see in the terminal:
   ```
   ✅ MySQL connected successfully to database: library_management
   🚀 Server running on http://localhost:5000
   ```
   If you see a MySQL connection error, double-check `DB_PASSWORD` in `.env`.

---

## STEP 4 — Open the website

1. Open your browser → go to: **http://localhost:5000**
2. You'll land on the Login/Register glass-style page.
3. Click **"Register now"** → create your **admin** account first:
   - Fill your name, email, password
   - Under "Register as" choose **Admin / Librarian**
   - Submit → then login with that email/password
4. You'll land on `admin.html` — the admin dashboard with charts, book management, users, borrow records.
5. Register a **second** account (in an incognito window or after logging out) as a **Student** — this is the account you'll demo the borrowing/wishlist/reviews features with.

---

## STEP 5 — Demo flow for your submission (suggested order)

**As Admin:**
1. Show the Overview tab — stats cards + 3 charts (most borrowed, category pie, monthly trend)
2. Go to "Manage Books" → click "+ Add New Book" → type an ISBN (e.g. `9780061120084`) → click **"🔍 Auto-fill"** → watch title/author/cover/description populate automatically from Google Books API — **this is your standout feature, emphasize it**
3. Show Edit/Delete on an existing book
4. Show "Users" tab → suspend/activate a student account

**As Student:**
1. Catalog tab — search a book, filter by category, sort by rating
2. Click a book → show details modal → **Borrow Now**
3. Go to "My Books" tab → show due date, then click **Return** to demonstrate fine calculation (or explain the ₹5/day logic)
4. Borrow a book that has 0 available copies (edit one in admin to set copies=0 to demo) → show **"Join Waitlist"** reservation queue feature
5. Go to a book → submit a star rating + review → show it appears
6. Show "Wishlist" tab and "For You" recommendations tab
7. Click the 🔔 bell icon → show notifications

---

## STEP 6 — Hosting it as a live website (optional, if time permits)

Since this is a Node.js + MySQL app, the simplest free options:

**Easiest path — Render.com:**
1. Push this whole project folder to a GitHub repository.
2. Create a free MySQL database on **Railway.app** or **Aiven** (free tier) — run `schema.sql` there via their console instead of Workbench.
3. On **Render.com** → New → Web Service → connect your GitHub repo → set root directory to `backend` → Build command: `npm install` → Start command: `npm start`.
4. Add environment variables in Render's dashboard (same as your `.env`: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, JWT_SECRET) pointing to your Railway/Aiven MySQL credentials.
5. Deploy — Render gives you a public URL like `https://libroverse.onrender.com`.

If you're short on time, **skip hosting** and just demo it on `localhost:5000` during submission — that's completely acceptable for an internship project; just be ready to run `npm start` live.

---
