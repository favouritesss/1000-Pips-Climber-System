const db = require('../db/jsonStore');
const shortid = require('shortid');

exports.getPlans = async (req, res) => {
    try {
        const plans = db.get('plans').value();
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getInvestments = async (req, res) => {
    try {
        const investments = db.get('investments')
            .filter({ user_id: req.user.id })
            .value();

        const enriched = investments.map(inv => {
            const plan = db.get('plans').find({ id: inv.plan_id }).value();
            return { ...inv, plan_name: plan ? plan.name : 'Unknown' };
        });

        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const transactions = db.get('transactions')
            .filter({ user_id: req.user.id })
            .orderBy(['created_at'], ['desc'])
            .take(50)
            .value();
        res.json(transactions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.invest = async (req, res) => {
    try {
        const { plan_id, amount } = req.body;
        const userId = req.user.id;

        const user = db.get('users').find({ id: userId }).value();
        if (user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        const plan = db.get('plans').find({ id: parseInt(plan_id) }).value();
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        if (amount < plan.min_deposit || amount > plan.max_deposit) {
            return res.status(400).json({ message: `Amount must be between $${plan.min_deposit} and $${plan.max_deposit}` });
        }

        db.get('users')
            .find({ id: userId })
            .assign({ balance: user.balance - amount })
            .write();

        db.get('investments').push({
            id: shortid.generate(),
            user_id: userId,
            plan_id: parseInt(plan_id),
            amount: parseFloat(amount),
            roi_accrued: 0,
            roi_percentage: plan.roi_percentage,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + plan.duration_days * 86400000).toISOString(),
            status: 'active'
        }).write();

        db.get('transactions').push({
            id: shortid.generate(),
            user_id: userId,
            type: 'investment',
            amount: parseFloat(amount),
            status: 'completed',
            description: `Invested in ${plan.name} plan`,
            created_at: new Date().toISOString()
        }).write();

        res.json({ message: 'Investment successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.requestDeposit = async (req, res) => {
    try {
        const { amount, method } = req.body;
        const userId = req.user.id;

        const newTx = {
            id: shortid.generate(),
            user_id: userId,
            type: 'deposit',
            amount: parseFloat(amount),
            status: 'pending',
            description: `Deposit via ${method}`,
            method: method,
            created_at: new Date().toISOString()
        };

        db.get('transactions').push(newTx).write();

        res.json({ message: 'Deposit request submitted. Please complete payment.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, wallet_address, method } = req.body;
        const userId = req.user.id;

        const user = db.get('users').find({ id: userId }).value();
        if (user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        db.get('users')
            .find({ id: userId })
            .assign({ balance: user.balance - amount })
            .write();

        db.get('transactions').push({
            id: shortid.generate(),
            user_id: userId,
            type: 'withdrawal',
            amount: parseFloat(amount),
            status: 'pending',
            description: `Withdrawal to ${method} - ${wallet_address}`,
            details: wallet_address,
            created_at: new Date().toISOString()
        }).write();

        res.json({ message: 'Withdrawal request submitted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
