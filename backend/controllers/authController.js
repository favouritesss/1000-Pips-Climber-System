const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../db/models');

exports.register = async (req, res) => {
    try {
        const { username, email, password, name, phone, country } = req.body;

        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) return res.status(400).json({ message: 'Username or email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            email,
            password: hashedPassword,
            fullname: name || '',
            phone: phone || '',
            country: country || ''
        });
        await user.save();

        res.status(201).json({ message: 'Registration successful! Please login.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

        const token = jwt.sign(
            { id: user._id.toString(), role: user.role },
            process.env.JWT_SECRET || 'pips1000secret',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email,
                fullname: user.fullname,
                role: user.role,
                balance: user.balance,
                earnings: user.earnings,
                referral_bonus: user.referral_bonus
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

exports.logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            fullname: user.fullname,
            balance: user.balance,
            earnings: user.earnings,
            referral_bonus: user.referral_bonus,
            role: user.role,
            status: user.status
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
