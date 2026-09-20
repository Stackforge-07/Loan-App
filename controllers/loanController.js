const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// GET /admin/loans
exports.getLoans = async (req, res) => {
  try {
    const adminUser = await User.findById(req.session.user._id);
    const { status } = req.query;

    let filter = {};
    if (adminUser.groupId) {
      filter.groupId = adminUser.groupId;
    }
    if (status) {
      filter.status = status;
    }

    const loans = await Loan.find(filter)
      .populate('memberId', 'name email phone')
      .sort({ createdAt: -1 });

    // Loan counts by status
    const statusCounts = {};
    const allLoans = await Loan.find(adminUser.groupId ? { groupId: adminUser.groupId } : {});
    allLoans.forEach(l => {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });

    res.render('admin/loans', {
      title: 'Loan Management — ArthSetu',
      loans,
      statusCounts,
      filterStatus: status || ''
    });
  } catch (error) {
    console.error('Loans error:', error);
    req.session.error = 'Failed to load loans.';
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/loans/:id
exports.getLoanDetail = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('memberId', 'name email phone address');

    if (!loan) {
      return res.status(404).render('errors/404', { title: 'Loan Not Found' });
    }

    const installments = await Installment.find({ loanId: loan._id })
      .sort({ installmentNumber: 1 });

    // Update overdue installments
    const now = new Date();
    for (const inst of installments) {
      if (inst.status === 'pending' && new Date(inst.dueDate) < now) {
        inst.status = 'overdue';
        await inst.save();
      }
    }

    // Refresh installments after update
    const updatedInstallments = await Installment.find({ loanId: loan._id })
      .sort({ installmentNumber: 1 });

    const Repayment = require('../models/Repayment');
    const repayments = await Repayment.find({ loanId: loan._id })
      .populate('recordedBy', 'name')
      .sort({ paymentDate: -1 });

    // Get members for repayment form
    const members = await User.find({
      groupId: loan.groupId,
      role: 'member',
      status: 'active'
    }).sort({ name: 1 });

    res.render('admin/loan-detail', {
      title: `Loan ${loan.loanId} — ArthSetu`,
      loan,
      installments: updatedInstallments,
      repayments,
      members
    });
  } catch (error) {
    console.error('Loan detail error:', error);
    req.session.error = 'Failed to load loan details.';
    res.redirect('/admin/loans');
  }
};

// PATCH /admin/loans/:id/status
exports.updateLoanStatus = async (req, res) => {
  try {
    const { action, rejectionReason, interestRate } = req.body;
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      req.session.error = 'Loan not found.';
      return res.redirect('/admin/loans');
    }

    const member = await User.findById(loan.memberId);

    switch (action) {
      case 'approve':
        loan.status = 'approved';
        loan.approvedAt = new Date();

        // Update interest rate if provided
        if (interestRate !== undefined && interestRate !== '') {
          loan.interestRate = parseFloat(interestRate);
          const interest = (loan.principalAmount * loan.interestRate * loan.tenure) / (12 * 100);
          loan.totalPayable = Math.round(loan.principalAmount + interest);
          loan.outstandingBalance = loan.totalPayable;
        }

        await loan.save();

        // Notify member
        await Notification.create({
          userId: loan.memberId,
          title: 'Loan Approved',
          message: `Your loan request of ₹${loan.principalAmount} has been approved! Total payable: ₹${loan.totalPayable}.`,
          type: 'success',
          link: `/member/loans/${loan._id}`
        });
        break;

      case 'reject':
        loan.status = 'rejected';
        loan.rejectedAt = new Date();
        loan.rejectionReason = rejectionReason || 'No reason provided.';
        await loan.save();

        await Notification.create({
          userId: loan.memberId,
          title: 'Loan Rejected',
          message: `Your loan request of ₹${loan.principalAmount} was not approved. Reason: ${loan.rejectionReason}`,
          type: 'error',
          link: `/member/loans/${loan._id}`
        });
        break;

      case 'disburse':
        loan.status = 'disbursed';
        loan.disbursedAt = new Date();
        await loan.save();

        // Generate installment schedule
        const installmentAmount = Math.floor(loan.totalPayable / loan.tenure);
        const lastInstallment = loan.totalPayable - (installmentAmount * (loan.tenure - 1));

        for (let i = 1; i <= loan.tenure; i++) {
          const dueDate = new Date(loan.disbursedAt);
          dueDate.setMonth(dueDate.getMonth() + i);
          dueDate.setDate(1); // Due on 1st of each month

          await Installment.create({
            loanId: loan._id,
            memberId: loan.memberId,
            installmentNumber: i,
            dueDate,
            amount: i === loan.tenure ? lastInstallment : installmentAmount,
            status: 'pending'
          });
        }

        // Update loan status to active
        loan.status = 'active';
        await loan.save();

        await Notification.create({
          userId: loan.memberId,
          title: 'Loan Disbursed',
          message: `Your loan of ₹${loan.principalAmount} has been disbursed. Your first installment is due next month.`,
          type: 'success',
          link: `/member/loans/${loan._id}`
        });
        break;

      default:
        req.session.error = 'Invalid action.';
        return res.redirect(`/admin/loans/${loan._id}`);
    }

    req.session.success = `Loan ${action}${action === 'approve' ? 'd' : action === 'reject' ? 'ed' : 'd'} successfully.`;
    res.redirect(`/admin/loans/${loan._id}`);
  } catch (error) {
    console.error('Update loan status error:', error);
    req.session.error = 'Failed to update loan status.';
    res.redirect('/admin/loans');
  }
};
