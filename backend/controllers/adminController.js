const db = require('../db/jsonStore');

exports.getUsers = async (req, res) => {
    try {
        const users = db.get('users').value();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { id, status } = req.body;
        db.get('users').find({ id }).assign({ status }).write();
        res.json({ message: 'User status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.fundUser = async (req, res) => {
    try {
        let { userId, amount } = req.body;
        amount = parseFloat(amount);
        if (!userId || isNaN(amount)) {
            return res.status(400).json({ message: 'Invalid data' });
        }

        // IDs may be stored as numbers (Date.now()) — try both string and number
        let user = db.get('users').find({ id: userId }).value();
        if (!user) user = db.get('users').find({ id: parseInt(userId) }).value();
        if (!user) user = db.get('users').find({ id: String(userId) }).value();
        if (!user) return res.status(404).json({ message: 'User not found' });

        const realId = user.id; // use the actual stored ID type
        db.get('users')
            .find({ id: realId })
            .assign({ balance: (user.balance || 0) + amount })
            .write();

        db.get('transactions').push({
            id: Date.now().toString(),
            user_id: realId,
            type: 'deposit',
            amount: amount,
            status: 'approved',
            description: 'Admin Allocation',
            created_at: new Date().toISOString()
        }).write();

        res.json({ message: `Successfully added $${amount} to ${user.username}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during funding' });
    }
};

exports.overrideBalance = async (req, res) => {
    try {
        let { userId, amount } = req.body;
        amount = parseFloat(amount);
        if (!userId || isNaN(amount)) {
            return res.status(400).json({ message: 'Invalid data' });
        }

        let user = db.get('users').find({ id: userId }).value();
        if (!user) user = db.get('users').find({ id: parseInt(userId) }).value();
        if (!user) user = db.get('users').find({ id: String(userId) }).value();
        if (!user) return res.status(404).json({ message: 'User not found' });

        const realId = user.id;
        db.get('users').find({ id: realId }).assign({ balance: amount }).write();

        db.get('transactions').push({
            id: Date.now().toString(),
            user_id: realId,
            type: 'deposit',
            amount: amount,
            status: 'approved',
            description: 'Admin Set Balance',
            created_at: new Date().toISOString()
        }).write();

        res.json({ message: `Balance has been set to $${amount}` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getPendingTransactions = async (req, res) => {
    try {
        const transactions = db.get('transactions')
            .filter({ status: 'pending' })
            .value();

        // Enrich with user info
        const enriched = transactions.map(tx => {
            const user = db.get('users').find({ id: tx.user_id }).value();
            return { ...tx, username: user ? user.username : 'Unknown', email: user ? user.email : 'Unknown' };
        });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.approveTransaction = async (req, res) => {
    try {
        const { id } = req.body;
        const tx = db.get('transactions').find({ id }).value();

        if (!tx) return res.status(404).json({ message: 'Transaction not found' });

        if (tx.type === 'deposit') {
            const user = db.get('users').find({ id: tx.user_id }).value();
            db.get('users').find({ id: tx.user_id }).assign({ balance: (user.balance || 0) + tx.amount }).write();
        }
        // Withdrawal already deducted balance in investController, so no balance change needed unless we want to "refund" on rejection.

        db.get('transactions').find({ id }).assign({ status: 'approved' }).write();
        res.json({ message: 'Transaction approved' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.rejectTransaction = async (req, res) => {
    try {
        const { id } = req.body;
        const tx = db.get('transactions').find({ id }).value();

        if (tx.type === 'withdrawal') {
            // Refund the user if we deducted balance on request
            const user = db.get('users').find({ id: tx.user_id }).value();
            db.get('users').find({ id: tx.user_id }).assign({ balance: (user.balance || 0) + tx.amount }).write();
        }

        db.get('transactions').find({ id }).assign({ status: 'rejected' }).write();
        res.json({ message: 'Transaction rejected' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = db.get('users').size().value();
        const activeInvestments = db.get('investments').filter({ status: 'active' }).size().value();

        const totalDeposits = db.get('transactions')
            .filter({ type: 'deposit', status: 'approved' })
            .map('amount')
            .value()
            .reduce((sum, n) => sum + n, 0);

        const totalWithdrawals = db.get('transactions')
            .filter({ type: 'withdrawal', status: 'approved' })
            .map('amount')
            .value()
            .reduce((sum, n) => sum + n, 0);

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
        const transactions = db.get('transactions').orderBy(['created_at'], ['desc']).take(100).value();
        const enriched = transactions.map(tx => {
            const user = db.get('users').find({ id: tx.user_id }).value();
            return { ...tx, username: user ? user.username : 'Unknown' };
        });
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getAllInvestments = async (req, res) => {
    try {
        const investments = db.get('investments').orderBy(['start_date'], ['desc']).value();
        const enriched = investments.map(inv => {
            const user = db.get('users').find({ id: inv.user_id }).value();
            const plan = db.get('plans').find({ id: inv.plan_id }).value();
            return {
                ...inv,
                username: user ? user.username : 'Unknown',
                plan_name: plan ? plan.name : 'Unknown'
            };
        });
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.body;
        db.get('users').remove({ id }).write();
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
