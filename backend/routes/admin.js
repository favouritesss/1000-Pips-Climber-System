const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');

router.get('/users', adminAuth, adminController.getUsers);
router.post('/users/status', adminAuth, adminController.updateUserStatus);
router.post('/users/fund', adminAuth, adminController.fundUser);
router.post('/users/override-balance', adminAuth, adminController.overrideBalance);
router.post('/users/delete', adminAuth, adminController.deleteUser);
router.get('/transactions/all', adminAuth, adminController.getAllTransactions);
router.get('/investments/all', adminAuth, adminController.getAllInvestments);
router.get('/transactions/pending', adminAuth, adminController.getPendingTransactions);
router.post('/transactions/approve', adminAuth, adminController.approveTransaction);
router.post('/transactions/reject', adminAuth, adminController.rejectTransaction);
router.get('/stats', adminAuth, adminController.getDashboardStats);

module.exports = router;
