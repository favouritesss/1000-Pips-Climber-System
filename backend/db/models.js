const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullname: { type: String, default: '' },
    phone: { type: String, default: '' },
    country: { type: String, default: '' },
    balance: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    referral_bonus: { type: Number, default: 0 },
    role: { type: String, default: 'user' },
    status: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // deposit, withdrawal, investment, roi, bonus
    amount: { type: Number, required: true },
    status: { type: String, default: 'pending' }, // pending, approved, rejected, completed
    description: { type: String, default: '' },
    method: { type: String, default: '' },
    details: { type: String, default: '' },
    created_at: { type: Date, default: Date.now }
});

const InvestmentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan_id: { type: Number, required: true },
    plan_name: { type: String, default: '' },
    amount: { type: Number, required: true },
    roi_accrued: { type: Number, default: 0 },
    roi_percentage: { type: Number, default: 0 },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date },
    status: { type: String, default: 'active' }
});

const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);
const Investment = mongoose.model('Investment', InvestmentSchema);

const PLANS = [
    { id: 1, name: 'Starter', min_deposit: 100, max_deposit: 1000, roi_percentage: 10, duration_days: 7 },
    { id: 2, name: 'Silver', min_deposit: 1001, max_deposit: 5000, roi_percentage: 20, duration_days: 14 },
    { id: 3, name: 'Gold', min_deposit: 5001, max_deposit: 20000, roi_percentage: 35, duration_days: 30 },
    { id: 4, name: 'Diamond', min_deposit: 20001, max_deposit: 100000, roi_percentage: 50, duration_days: 60 }
];

module.exports = { User, Transaction, Investment, PLANS };
