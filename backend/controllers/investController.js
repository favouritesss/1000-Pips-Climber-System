const { initDb } = require('../db/init');

exports.getPlans = async (req, res) => {
    try {
        const db = await initDb();
        const plans = await db.all('SELECT * FROM plans');
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.invest = async (req, res) => {
    try {
        const { plan_id, amount } = req.body;
        const db = await initDb();

        const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        if (user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        const plan = await db.get('SELECT * FROM plans WHERE id = ?', [plan_id]);
        if (!plan || amount < plan.min_deposit || amount > plan.max_deposit) {
            return res.status(400).json({ message: 'Invalid plan or amount' });
        }

        await db.run('BEGIN TRANSACTION');
        await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, req.user.id]);

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.duration_days);

        await db.run(
            'INSERT INTO investments (user_id, plan_id, amount, end_date) VALUES (?, ?, ?, ?)',
            [req.user.id, plan_id, amount, endDate.toISOString()]
        );

        await db.run(
            'INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'investment', amount, 'completed', `Investment in ${plan.name} plan`]
        );

        await db.run('COMMIT');

        res.json({ message: 'Investment successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInvestments = async (req, res) => {
    try {
        const db = await initDb();
        const investments = await db.all(`
            SELECT i.*, p.name as plan_name, p.roi_percentage 
            FROM investments i 
            JOIN plans p ON i.plan_id = p.id 
            WHERE i.user_id = ?
        `, [req.user.id]);
        res.json(investments);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const db = await initDb();
        const transactions = await db.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.requestDeposit = async (req, res) => {
    try {
        const { amount, method } = req.body;
        const db = await initDb();
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'deposit', amount, 'pending', `Deposit request via ${method}`]
        );
        res.json({ message: 'Deposit request submitted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, method, wallet_address } = req.body;
        const db = await initDb();

        const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        if (user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        await db.run(
            'INSERT INTO transactions (user_id, type, amount, status, description) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'withdrawal', amount, 'pending', `Withdrawal request to ${wallet_address} via ${method}`]
        );
        res.json({ message: 'Withdrawal request submitted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
