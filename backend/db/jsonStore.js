const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const bcrypt = require('bcryptjs');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

// Initialize DB with defaults
db.defaults({
    users: [],
    investments: [],
    transactions: [],
    plans: [
        { id: 1, name: 'Starter', min_deposit: 100, max_deposit: 1000, roi_percentage: 10, duration_days: 7 },
        { id: 2, name: 'Silver', min_deposit: 1001, max_deposit: 5000, roi_percentage: 20, duration_days: 14 },
        { id: 3, name: 'Gold', min_deposit: 5001, max_deposit: 20000, roi_percentage: 35, duration_days: 30 },
        { id: 4, name: 'Diamond', min_deposit: 20001, max_deposit: 100000, roi_percentage: 50, duration_days: 60 }
    ]
}).write();

// Ensure admin exists
const admin = db.get('users').find({ role: 'admin' }).value();
if (!admin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.get('users').push({
        id: Date.now(),
        username: 'admin',
        email: 'admin@1000pips.com',
        password: hashedPassword,
        fullname: 'Administrator',
        role: 'admin',
        balance: 0,
        earnings: 0,
        referral_bonus: 0,
        status: 'active',
        created_at: new Date().toISOString()
    }).write();
    console.log('Admin created: admin@1000pips.com / admin123');
}

module.exports = db;
