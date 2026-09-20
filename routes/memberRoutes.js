const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { isAuthenticated, isMember } = require('../middleware/auth');
const { loanRequestValidation } = require('../middleware/validators');

// All member routes require authentication + member role
router.use(isAuthenticated, isMember);

// Dashboard
router.get('/dashboard', memberController.getDashboard);

// Profile
router.get('/profile', memberController.getProfile);
router.post('/profile', memberController.updateProfile);

// Savings
router.get('/savings', memberController.getSavings);

// Loans
router.get('/loans', memberController.getLoans);
router.get('/loans/request', memberController.getLoanRequest);
router.post('/loans/request', loanRequestValidation, memberController.postLoanRequest);
router.get('/loans/:id', memberController.getLoanDetail);

// Repayments
router.get('/repayments', memberController.getRepayments);

// Notifications
router.get('/notifications', memberController.getNotifications);

module.exports = router;
