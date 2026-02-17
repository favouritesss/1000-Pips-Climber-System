const { initDb } = require('../db/init');

exports.getUsers = async (req, res) => {
    try {
        const db = await initDb();
        const users = await db.all('SELECT id, username, email, fullname, role, status, balance, created_at FROM users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { id, status } = req.body;
        const db = await initDb();
        await db.run('UPDATE users SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'User status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getPendingTransactions = async (req, res) => {
    try {
        const db = await initDb();
        const transactions = await db.all(`
            SELECT t.*, u.username, u.email 
            FROM transactions t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.status = 'pending'
        `);
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.approveTransaction = async (req, res) => {
    try {
        const { id } = req.body;
        const db = await initDb();

        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        await db.run('BEGIN TRANSACTION');

        if (transaction.type === 'deposit') {
            await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [transaction.amount, transaction.user_id]);
        } else if (transaction.type === 'withdrawal') {
            await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [transaction.amount, transaction.user_id]);
        }

        await db.run('UPDATE transactions SET status = "approved" WHERE id = ?', [id]);

        await db.run('COMMIT');
        res.json({ message: 'Transaction approved' });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ message: 'Server error' });
    }
};

exports.rejectTransaction = async (req, res) => {
    try {
        const { id } = req.body;
        const db = await initDb();
        await db.run('UPDATE transactions SET status = "rejected" WHERE id = ?', [id]);
        res.json({ message: 'Transaction rejected' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const db = await initDb();
        const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
        const activeInvestments = await db.get('SELECT COUNT(*) as count FROM investments WHERE status = "active"');
        const totalDeposits = await db.get('SELECT SUM(amount) as total FROM transactions WHERE type = "deposit" AND status = "approved"');
        const totalWithdrawals = await db.get('SELECT SUM(amount) as total FROM transactions WHERE type = "withdrawal" AND status = "approved"');

        res.json({
            totalUsers: totalUsers.count,
            activeInvestments: activeInvestments.count,
            totalDeposits: totalDeposits.total || 0,
            totalWithdrawals: totalWithdrawals.total || 0,
            revenue: (totalDeposits.total || 0) * 0.05 // Example revenue stat
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.fundUser = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        if (!userId || isNaN(amount)) {
            exports.fundUser = async (req, res) => {
                try {
                    const { userId, amount } = req.body;
                    if (!userId || isNaN(amount)) {
                        return res.status(400).json({ message: 'Invalid data' });
                    }

                    const db = await initDb();
                    await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);
                    await db.run('INSERT INTO transactions (user_id, type, amount, status, description, created_at) VALUES (?, "deposit", ?, "approved", "Admin Allocation", datetime("now"))', [userId, amount]);

                    res.json({ message: `Successfully added $${amount}` });
                } catch (err) {
                    console.error(err);
                    res.status(500).json({ message: 'Server error during funding' });
                }
            };

            exports.overrideBalance = async (req, res) => {
                try {
                    const { userId, amount } = req.body;
                    if (!userId || isNaN(amount)) {
                        return res.status(400).json({ message: 'Invalid data' });
                    }

                    const db = await initDb();
                    await db.run('UPDATE users SET balance = ? WHERE id = ?', [amount, userId]);
                    await db.run('INSERT INTO transactions (user_id, type, amount, status, description, created_at) VALUES (?, "deposit", ?, "approved", "Admin Set Balance", datetime("now"))', [userId, amount]);

                    res.json({ message: `Balance has been set to $${amount}` });
                } catch (err) {
                    res.status(500).json({ message: 'Server error' });
                }
            };

            exports.deleteUser = async (req, res) => {
                try {
                    const { id } = req.body;
                    const db = await initDb();
                    await db.run('DELETE FROM users WHERE id = ?', [id]);
                    res.json({ message: 'User deleted successfully' });
                } catch (err) {
                    res.status(500).json({ message: 'Server error' });
                }
            };

            exports.getAllTransactions = async (req, res) => {
                try {
                    const db = await initDb();
                    const transactions = await db.all(`
            SELECT t.*, u.username 
            FROM transactions t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.created_at DESC
            LIMIT 100
        `);
                    res.json(transactions);
                } catch (err) {
                    res.status(500).json({ message: 'Server error' });
                }
            };

            exports.getAllInvestments = async (req, res) => {
                try {
                    const db = await initDb();
                    const investments = await db.all(`
            SELECT i.*, u.username, p.name as plan_name 
            FROM investments i
            JOIN users u ON i.user_id = u.id 
            JOIN plans p ON i.plan_id = p.id
            ORDER BY i.start_date DESC
        `);
                    res.json(investments);
                } catch (err) {
                    res.status(500).json({ message: 'Server error' });
                }
            };

