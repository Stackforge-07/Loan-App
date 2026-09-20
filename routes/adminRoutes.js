const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const savingsController = require('../controllers/savingsController');
const loanController = require('../controllers/loanController');
const repaymentController = require('../controllers/repaymentController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { savingsValidation, repaymentValidation } = require('../middleware/validators');

// All admin routes require authentication + admin role
router.use(isAuthenticated, isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Groups
router.get('/groups', adminController.getGroups);
router.post('/groups', adminController.createGroup);
router.get('/groups/:id', adminController.getGroupDetail);
router.post('/groups/:id/edit', adminController.updateGroup);

// Members
router.get('/members', adminController.getMembers);
router.get('/members/:id', adminController.getMemberDetail);
router.post('/members/:id/toggle-status', adminController.toggleMemberStatus);

// Savings
router.get('/savings', savingsController.getSavings);
router.post('/savings', savingsValidation, savingsController.recordSavings);

// Loans
router.get('/loans', loanController.getLoans);
router.get('/loans/:id', loanController.getLoanDetail);
router.post('/loans/:id/status', loanController.updateLoanStatus);

// Repayments
router.get('/repayments', repaymentController.getRepayments);
router.post('/repayments', repaymentValidation, repaymentController.recordRepayment);

// Reports
router.get('/reports', adminController.getReports);
router.get('/reports/export', adminController.exportReport);

// Overdue
router.get('/overdue', adminController.getOverdue);

// Notifications
router.get('/notifications', adminController.getNotifications);

module.exports = router;
