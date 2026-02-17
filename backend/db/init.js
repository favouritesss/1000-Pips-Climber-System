const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbInstance = null;

async function initDb() {
    if (dbInstance) return dbInstance;

    dbInstance = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    await dbInstance.exec('PRAGMA journal_mode = WAL;');



    await dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT,
            fullname TEXT,
            phone TEXT,
            country TEXT,
            balance REAL DEFAULT 0,
            earnings REAL DEFAULT 0,
            referral_bonus REAL DEFAULT 0,
            role TEXT DEFAULT 'user',
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            min_deposit REAL,
            max_deposit REAL,
            roi_percentage REAL,
            duration_days INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS investments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            plan_id INTEGER,
            amount REAL,
            roi_accrued REAL DEFAULT 0,
            start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            end_date DATETIME,
            status TEXT DEFAULT 'active',
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(plan_id) REFERENCES plans(id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT, -- 'deposit', 'withdrawal', 'bonus', 'roi'
            amount REAL,
            status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);

    // Add some default plans
    const plansCount = await dbInstance.get('SELECT COUNT(*) as count FROM plans');
    if (plansCount.count === 0) {
        await dbInstance.run('INSERT INTO plans (name, min_deposit, max_deposit, roi_percentage, duration_days) VALUES (?, ?, ?, ?, ?)', ['Starter', 100, 1000, 10, 7]);
        await dbInstance.run('INSERT INTO plans (name, min_deposit, max_deposit, roi_percentage, duration_days) VALUES (?, ?, ?, ?, ?)', ['Silver', 1001, 5000, 20, 14]);
        await dbInstance.run('INSERT INTO plans (name, min_deposit, max_deposit, roi_percentage, duration_days) VALUES (?, ?, ?, ?, ?)', ['Gold', 5001, 20000, 35, 30]);
        await dbInstance.run('INSERT INTO plans (name, min_deposit, max_deposit, roi_percentage, duration_days) VALUES (?, ?, ?, ?, ?)', ['Diamond', 20001, 100000, 50, 60]);
    }

    // Add admin user if not exists
    const admin = await dbInstance.get('SELECT * FROM users WHERE role = "admin"');
    if (!admin) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await dbInstance.run('INSERT INTO users (username, email, password, role, fullname) VALUES (?, ?, ?, ?, ?)', ['admin', 'admin@1000pips.com', hashedPassword, 'admin', 'Administrator']);
    }

    console.log('Database initialized successfully.');
    return dbInstance;
}

module.exports = { initDb };
