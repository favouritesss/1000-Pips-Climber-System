const { User, Transaction, Investment, PLANS } = require('../db/models');

exports.getPlans = async (req, res) => {
    res.json(PLANS);
};

exports.getInvestments = async (req, res) => {
    try {
        const investments = await Investment.find({ user_id: req.user.id });
        res.json(investments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user_id: req.user.id })
            .sort({ created_at: -1 })
            .limit(50);
        res.json(transactions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.invest = async (req, res) => {
    try {
        const { plan_id, amount } = req.body;
        const parsedAmount = parseFloat(amount);

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.balance < parsedAmount) return res.status(400).json({ message: 'Insufficient balance' });

        const plan = PLANS.find(p => p.id === parseInt(plan_id));
        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        if (parsedAmount < plan.min_deposit || parsedAmount > plan.max_deposit) {
            return res.status(400).json({ message: `Amount must be between $${plan.min_deposit} and $${plan.max_deposit}` });
        }

        user.balance -= parsedAmount;
        await user.save();

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.duration_days);

        await Investment.create({
            user_id: req.user.id,
            plan_id: plan.id,
            plan_name: plan.name,
            amount: parsedAmount,
            roi_percentage: plan.roi_percentage,
            end_date: endDate
        });

        await Transaction.create({
            user_id: req.user.id,
            type: 'investment',
            amount: parsedAmount,
            status: 'completed',
            description: `Invested in ${plan.name} plan`
        });

        res.json({ message: 'Investment successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.requestDeposit = async (req, res) => {
    try {
        const { amount, method } = req.body;
        await Transaction.create({
            user_id: req.user.id,
            type: 'deposit',
            amount: parseFloat(amount),
            status: 'pending',
            description: `Deposit via ${method}`,
            method
        });
        res.json({ message: 'Deposit request submitted. Please complete payment.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, wallet_address, method } = req.body;
        const parsedAmount = parseFloat(amount);

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.balance < parsedAmount) return res.status(400).json({ message: 'Insufficient balance' });

        user.balance -= parsedAmount;
        await user.save();

        await Transaction.create({
            user_id: req.user.id,
            type: 'withdrawal',
            amount: parsedAmount,
            status: 'pending',
            description: `Withdrawal to ${method}`,
            details: wallet_address
        });

        res.json({ message: 'Withdrawal request submitted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
