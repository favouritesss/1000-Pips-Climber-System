const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
require('./db/mongoose');
const { User } = require('./db/models');

const authRoutes = require('./routes/auth');
const investRoutes = require('./routes/invest');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/invest', investRoutes);
app.use('/api/admin', adminRoutes);

// API Status
app.get('/api', (req, res) => {
    res.json({ message: '1000 Pips Climber API v2.0 - MongoDB' });
});

// HTML Routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Catch-all for SPA
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ message: 'API Route Not Found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

async function seedAdmin() {
    try {
        const existing = await User.findOne({ role: 'admin' });
        if (!existing) {
            const hashed = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                email: 'admin@1000pips.com',
                password: hashed,
                fullname: 'Administrator',
                role: 'admin',
                status: 'active'
            });
            console.log('✅ Admin seeded: admin@1000pips.com / admin123');
        }
    } catch (err) {
        console.error('Admin seed error:', err.message);
    }
}

app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await seedAdmin();
});
