const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/jsonStore');
const shortid = require('shortid');

exports.register = async (req, res) => {
    try {
        const { username, email, password, name, phone, country } = req.body;

        const existingUser = db.get('users').find(u => u.username === username || u.email === email).value();

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: shortid.generate(),
            username,
            email,
            password: hashedPassword,
            fullname: name,
            phone,
            country,
            balance: 0,
            earnings: 0,
            referral_bonus: 0,
            role: 'user',
            status: 'active',
            created_at: new Date().toISOString()
        };

        db.get('users').push(newUser).write();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = db.get('users').find({ email }).value();

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, { httpOnly: true });
        res.json({
            token, user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullname: user.fullname,
                balance: user.balance || 0,
                earnings: user.earnings || 0,
                referral_bonus: user.referral_bonus || 0
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
        const user = db.get('users').find({ id: req.user.id }).value();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            balance: user.balance || 0,
            earnings: user.earnings || 0,
            referral_bonus: user.referral_bonus || 0,
            role: user.role,
            status: user.status
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
