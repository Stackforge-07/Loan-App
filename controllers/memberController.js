const User = require('../models/User');
const Group = require('../models/Group');
const SavingsTransaction = require('../models/SavingsTransaction');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const Repayment = require('../models/Repayment');
const Notification = require('../models/Notification');

// GET /member/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    // Total Savings
    const savingsAgg = await SavingsTransaction.aggregate([
      { $match: { memberId: user._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalSavings = savingsAgg.length > 0 ? savingsAgg[0].total : 0;

    // Current active loan
    const currentLoan = await Loan.findOne({
      memberId: userId,
      status: { $in: ['disbursed', 'active', 'partially_paid'] }
    }).sort({ createdAt: -1 });

    const outstandingBalance = currentLoan ? currentLoan.outstandingBalance : 0;
    const currentLoanAmount = currentLoan ? currentLoan.totalPayable : 0;

    // Next installment
    const nextInstallment = await Installment.findOne({
      memberId: userId,
      status: { $in: ['pending', 'overdue'] }
    }).sort({ dueDate: 1 });

    // Recent savings
    const recentSavings = await SavingsTransaction.find({ memberId: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent notifications
    const recentNotifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.render('member/dashboard', {
      title: 'Dashboard — ArthSetu',
      user,
      totalSavings,
      currentLoan,
      currentLoanAmount,
      outstandingBalance,
      nextInstallment,
      recentSavings,
      recentNotifications
    });
  } catch (error) {
    console.error('Member dashboard error:', error);
    req.session.error = 'Failed to load dashboard.';
    res.redirect('/');
  }
};

// GET /member/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id).populate('groupId');
    const savingsAgg = await SavingsTransaction.aggregate([
      { $match: { memberId: user._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalSavings = savingsAgg.length > 0 ? savingsAgg[0].total : 0;

    res.render('member/profile', {
      title: 'My Profile — ArthSetu',
      user,
      totalSavings
    });
  } catch (error) {
    console.error('Profile error:', error);
    req.session.error = 'Failed to load profile.';
    res.redirect('/member/dashboard');
  }
};

// POST /member/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await User.findByIdAndUpdate(req.session.user._id, {
      name: name.trim(),
      phone: phone.trim(),
      address: address ? address.trim() : ''
    });
    req.session.user.name = name.trim();
    req.session.success = 'Profile updated successfully.';
    res.redirect('/member/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.session.error = 'Failed to update profile.';
    res.redirect('/member/profile');
  }
};

// GET /member/savings
exports.getSavings = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { year, month } = req.query;

    let filter = { memberId: userId };
    if (year) filter.year = parseInt(year);
    if (month) filter.month = month;

    const savings = await SavingsTransaction.find(filter)
      .populate('recordedBy', 'name')
      .sort({ year: -1, createdAt: -1 });

    const savingsAgg = await SavingsTransaction.aggregate([
      { $match: { memberId: userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalSavings = savingsAgg.length > 0 ? savingsAgg[0].total : 0;

    // Calculate monthly average
    const monthCount = await SavingsTransaction.countDocuments({ memberId: userId });
    const monthlyAvg = monthCount > 0 ? Math.round(totalSavings / monthCount) : 0;

    res.render('member/savings', {
      title: 'Savings Passbook — ArthSetu',
      savings,
      totalSavings,
      monthlyAvg,
      filterYear: year || '',
      filterMonth: month || ''
    });
  } catch (error) {
    console.error('Savings error:', error);
    req.session.error = 'Failed to load savings.';
    res.redirect('/member/dashboard');
  }
};

// GET /member/loans
exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ memberId: req.session.user._id })
      .sort({ createdAt: -1 });

    res.render('member/loans', {
      title: 'My Loans — ArthSetu',
      loans
    });
  } catch (error) {
    console.error('Loans error:', error);
    req.session.error = 'Failed to load loans.';
    res.redirect('/member/dashboard');
  }
};

// GET /member/loans/:id
exports.getLoanDetail = async (req, res) => {
  try {
    const loan = await Loan.findOne({
      _id: req.params.id,
      memberId: req.session.user._id
    });

    if (!loan) {
      return res.status(404).render('errors/404', { title: 'Loan Not Found' });
    }

    const installments = await Installment.find({ loanId: loan._id })
      .sort({ installmentNumber: 1 });

    const repayments = await Repayment.find({ loanId: loan._id })
      .sort({ paymentDate: -1 });

    res.render('member/loan-detail', {
      title: `Loan ${loan.loanId} — ArthSetu`,
      loan,
      installments,
      repayments
    });
  } catch (error) {
    console.error('Loan detail error:', error);
    req.session.error = 'Failed to load loan details.';
    res.redirect('/member/loans');
  }
};

// GET /member/loans/request
exports.getLoanRequest = (req, res) => {
  res.render('member/loan-request', {
    title: 'Request Loan — ArthSetu',
    errors: []
  });
};

// POST /member/loans/request
exports.postLoanRequest = async (req, res) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.render('member/loan-request', {
        title: 'Request Loan — ArthSetu',
        errors: errors.array(),
        body: req.body
      });
    }

    const { principalAmount, purpose, tenure, interestRate, notes } = req.body;
    const userId = req.session.user._id;
    const user = await User.findById(userId);

    // Check for existing active loan
    const activeLoan = await Loan.findOne({
      memberId: userId,
      status: { $in: ['requested', 'pending', 'approved', 'disbursed', 'active', 'partially_paid'] }
    });

    if (activeLoan) {
      return res.render('member/loan-request', {
        title: 'Request Loan — ArthSetu',
        errors: [{ msg: 'You already have an active loan or pending request. Please complete it before requesting a new one.' }],
        body: req.body
      });
    }

    const rate = parseFloat(interestRate) || 0;
    const interest = (parseFloat(principalAmount) * rate * parseInt(tenure)) / (12 * 100);
    const totalPayable = Math.round(parseFloat(principalAmount) + interest);

    const loan = new Loan({
      memberId: userId,
      groupId: user.groupId,
      principalAmount: parseFloat(principalAmount),
      purpose,
      tenure: parseInt(tenure),
      interestRate: rate,
      totalPayable,
      outstandingBalance: totalPayable,
      status: 'requested',
      notes: notes || ''
    });
    await loan.save();

    // Notify admin(s) of group
    const admins = await User.find({ groupId: user.groupId, role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Loan Request',
        message: `${user.name} has requested a loan of ₹${principalAmount} for ${purpose}.`,
        type: 'info',
        link: `/admin/loans/${loan._id}`
      });
    }

    req.session.success = 'Loan request submitted successfully. You will be notified once it is reviewed.';
    res.redirect('/member/loans');
  } catch (error) {
    console.error('Loan request error:', error);
    res.render('member/loan-request', {
      title: 'Request Loan — ArthSetu',
      errors: [{ msg: 'Failed to submit loan request. Please try again.' }],
      body: req.body
    });
  }
};

// GET /member/repayments
exports.getRepayments = async (req, res) => {
  try {
    const repayments = await Repayment.find({ memberId: req.session.user._id })
      .populate('loanId', 'loanId principalAmount')
      .sort({ paymentDate: -1 });

    res.render('member/repayments', {
      title: 'Repayments — ArthSetu',
      repayments
    });
  } catch (error) {
    console.error('Repayments error:', error);
    req.session.error = 'Failed to load repayments.';
    res.redirect('/member/dashboard');
  }
};

// GET /member/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.session.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.render('member/notifications', {
      title: 'Notifications — ArthSetu',
      notifications
    });
  } catch (error) {
    console.error('Notifications error:', error);
    req.session.error = 'Failed to load notifications.';
    res.redirect('/member/dashboard');
  }
};
