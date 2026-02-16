const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDb } = require('../db/init');

exports.register = async (req, res) => {
    try {
        const { username, email, password, name, phone, country } = req.body;
        const db = await initDb();

        const existingUser = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
            'INSERT INTO users (username, email, password, fullname, phone, country) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, name, phone, country]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const db = await initDb();

        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        if (user.status === 'inactive') {
            return res.status(403).json({ message: 'Account is deactivated' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullname: user.fullname,
                balance: user.balance
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
};

exports.getProfile = async (req, res) => {
    try {
        const db = await initDb();
        const user = await db.get('SELECT id, username, email, fullname, phone, country, balance, earnings, referral_bonus, role, status FROM users WHERE id = ?', [req.user.id]);
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
