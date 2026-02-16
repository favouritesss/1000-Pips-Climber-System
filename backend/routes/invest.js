const express = require('express');
const router = express.Router();
const investController = require('../controllers/investController');
const { auth } = require('../middleware/auth');

router.get('/plans', investController.getPlans);
router.post('/invest', auth, investController.invest);
router.get('/investments', auth, investController.getInvestments);
router.get('/transactions', auth, investController.getTransactions);
router.post('/deposit', auth, investController.requestDeposit);
router.post('/withdraw', auth, investController.requestWithdrawal);

module.exports = router;
