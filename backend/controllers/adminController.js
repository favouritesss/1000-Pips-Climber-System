const bcrypt = require('bcryptjs');
const { User, Transaction, Investment } = require('../db/models');

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password').sort({ created_at: -1 });
        res.json(users.map(u => ({
            id: u._id.toString(),
            username: u.username,
            email: u.email,
            fullname: u.fullname,
            balance: u.balance,
            earnings: u.earnings,
            referral_bonus: u.referral_bonus,
            status: u.status,
            created_at: u.created_at
        })));
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.fundUser = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        console.log(`[Admin] Funding user ${userId} with amount ${amount}`);
        const parsedAmount = parseFloat(amount);
        if (!userId || isNaN(parsedAmount)) return res.status(400).json({ message: 'Invalid data' });

        const user = await User.findById(userId);
        if (!user) {
            console.log(`[Admin] User ${userId} not found`);
            return res.status(404).json({ message: 'User not found' });
        }

        user.balance += parsedAmount;
        await user.save();
        console.log(`[Admin] User ${user.username} balance updated to ${user.balance}`);

        await Transaction.create({
            user_id: userId,
            type: 'deposit',
            amount: parsedAmount,
            status: 'approved',
            description: 'Admin Allocation'
        });

        res.json({ message: `Successfully added $${parsedAmount} to ${user.username}` });
    } catch (err) {
        console.error('[Admin] Fund user error:', err);
        res.status(500).json({ message: 'Server error during funding' });
    }
};

exports.overrideBalance = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const parsedAmount = parseFloat(amount);
        if (!userId || isNaN(parsedAmount)) return res.status(400).json({ message: 'Invalid data' });

        const user = await User.findByIdAndUpdate(userId, { balance: parsedAmount }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });

        await Transaction.create({
            user_id: userId,
            type: 'deposit',
            amount: parsedAmount,
            status: 'approved',
            description: 'Admin Set Balance'
        });

        res.json({ message: `Balance set to $${parsedAmount}` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.overrideEarnings = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const parsedAmount = parseFloat(amount);
        if (!userId || isNaN(parsedAmount)) return res.status(400).json({ message: 'Invalid data' });

        const user = await User.findByIdAndUpdate(userId, { earnings: parsedAmount }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: `Earnings set to $${parsedAmount}` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};


exports.updateUserStatus = async (req, res) => {
    try {
        const { id, status } = req.body;
        await User.findByIdAndUpdate(id, { status });
        res.json({ message: 'User status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.body;
        await User.findByIdAndDelete(id);
        await Transaction.deleteMany({ user_id: id });
        await Investment.deleteMany({ user_id: id });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getPendingTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ status: 'pending' }).sort({ created_at: -1 });
        const enriched = await Promise.all(transactions.map(async tx => {
            const user = await User.findById(tx.user_id).select('username email');
            return {
                ...tx.toObject(),
                id: tx._id.toString(),
                username: user ? user.username : 'Unknown',
                email: user ? user.email : 'Unknown'
            };
        }));
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.approveTransaction = async (req, res) => {
    try {
        const { id } = req.body;
        const tx = await Transaction.findById(id);
        if (!tx) return res.status(404).json({ message: 'Transaction not found' });

        if (tx.type === 'deposit') {
            await User.findByIdAndUpdate(tx.user_id, { $inc: { balance: tx.amount } });
        }

        tx.status = 'approved';
        await tx.save();
        res.json({ message: 'Transaction approved' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.rejectTransaction = async (req, res) => {
    try {
        const { id } = req.body;
        const tx = await Transaction.findById(id);
        if (!tx) return res.status(404).json({ message: 'Transaction not found' });

        if (tx.type === 'withdrawal') {
            // Refund the balance
            await User.findByIdAndUpdate(tx.user_id, { $inc: { balance: tx.amount } });
        }

        tx.status = 'rejected';
        await tx.save();
        res.json({ message: 'Transaction rejected' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const activeInvestments = await Investment.countDocuments({ status: 'active' });

        const depositAgg = await Transaction.aggregate([
            { $match: { type: 'deposit', status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const withdrawalAgg = await Transaction.aggregate([
            { $match: { type: 'withdrawal', status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalDeposits = depositAgg[0]?.total || 0;
        const totalWithdrawals = withdrawalAgg[0]?.total || 0;

        res.json({
            totalUsers,
            activeInvestments,
            totalDeposits,
            totalWithdrawals,
            revenue: totalDeposits * 0.05
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ created_at: -1 }).limit(100);
        const enriched = await Promise.all(transactions.map(async tx => {
            const user = await User.findById(tx.user_id).select('username');
            return {
                ...tx.toObject(),
                id: tx._id.toString(),
                username: user ? user.username : 'Unknown'
            };
        }));
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllInvestments = async (req, res) => {
    try {
        const investments = await Investment.find().sort({ start_date: -1 });
        const enriched = await Promise.all(investments.map(async inv => {
            const user = await User.findById(inv.user_id).select('username');
            return {
                ...inv.toObject(),
                id: inv._id.toString(),
                username: user ? user.username : 'Unknown'
            };
        }));
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
