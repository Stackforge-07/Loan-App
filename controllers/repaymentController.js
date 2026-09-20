const Repayment = require('../models/Repayment');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

// GET /admin/repayments
exports.getRepayments = async (req, res) => {
  try {
    const adminUser = await User.findById(req.session.user._id);
    const groupId = adminUser.groupId;

    // Get active loans for dropdown
    let activeLoans = [];
    let members = [];
    if (groupId) {
      activeLoans = await Loan.find({
        groupId,
        status: { $in: ['active', 'partially_paid', 'disbursed'] }
      }).populate('memberId', 'name');

      members = await User.find({ groupId, role: 'member', status: 'active' }).sort({ name: 1 });
    }

    // Get repayment history
    let filter = {};
    if (groupId) {
      const memberIds = await User.find({ groupId, role: 'member' }).distinct('_id');
      filter.memberId = { $in: memberIds };
    }

    const repayments = await Repayment.find(filter)
      .populate('memberId', 'name email')
      .populate('loanId', 'loanId principalAmount')
      .populate('recordedBy', 'name')
      .sort({ paymentDate: -1 })
      .limit(100);

    res.render('admin/repayments', {
      title: 'Repayments — ArthSetu',
      activeLoans,
      members,
      repayments
    });
  } catch (error) {
    console.error('Repayments page error:', error);
    req.session.error = 'Failed to load repayments page.';
    res.redirect('/admin/dashboard');
  }
};

// POST /admin/repayments
exports.recordRepayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.error = errors.array().map(e => e.msg).join(', ');
      return res.redirect('/admin/repayments');
    }

    const { loanId, memberId, amount, paymentMethod, paymentDate, notes } = req.body;

    const loan = await Loan.findById(loanId);
    if (!loan) {
      req.session.error = 'Loan not found.';
      return res.redirect('/admin/repayments');
    }

    const repayAmount = parseFloat(amount);

    // Prevent overpayment
    if (repayAmount > loan.outstandingBalance) {
      req.session.error = `Repayment amount (₹${repayAmount}) exceeds outstanding balance (₹${loan.outstandingBalance}).`;
      return res.redirect('/admin/repayments');
    }

    // Find the next pending/overdue installment
    const pendingInstallment = await Installment.findOne({
      loanId: loan._id,
      status: { $in: ['pending', 'overdue'] }
    }).sort({ installmentNumber: 1 });

    // Record repayment
    const repayment = new Repayment({
      loanId: loan._id,
      memberId: memberId || loan.memberId,
      installmentId: pendingInstallment ? pendingInstallment._id : null,
      amount: repayAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'cash',
      notes: notes || '',
      recordedBy: req.session.user._id
    });
    await repayment.save();

    // Update loan amounts
    loan.amountPaid += repayAmount;
    loan.outstandingBalance = loan.totalPayable - loan.amountPaid;

    // Update installment status
    if (pendingInstallment) {
      pendingInstallment.paidAmount += repayAmount;
      if (pendingInstallment.paidAmount >= pendingInstallment.amount) {
        pendingInstallment.status = 'paid';
        pendingInstallment.paidAt = new Date();

        // Handle excess and apply to next installment
        let excess = pendingInstallment.paidAmount - pendingInstallment.amount;
        await pendingInstallment.save();

        while (excess > 0) {
          const nextInst = await Installment.findOne({
            loanId: loan._id,
            status: { $in: ['pending', 'overdue'] }
          }).sort({ installmentNumber: 1 });

          if (!nextInst) break;

          nextInst.paidAmount += excess;
          if (nextInst.paidAmount >= nextInst.amount) {
            excess = nextInst.paidAmount - nextInst.amount;
            nextInst.status = 'paid';
            nextInst.paidAt = new Date();
          } else {
            nextInst.status = 'partially_paid';
            excess = 0;
          }
          await nextInst.save();
        }
      } else {
        pendingInstallment.status = 'partially_paid';
        await pendingInstallment.save();
      }
    }

    // Check if loan is fully paid
    if (loan.outstandingBalance <= 0) {
      loan.outstandingBalance = 0;
      loan.status = 'completed';
      loan.completedAt = new Date();

      // Mark all remaining installments as paid
      await Installment.updateMany(
        { loanId: loan._id, status: { $in: ['pending', 'overdue', 'partially_paid'] } },
        { $set: { status: 'paid', paidAt: new Date() } }
      );
    } else {
      loan.status = 'partially_paid';
    }

    await loan.save();

    // Notify member
    const member = await User.findById(loan.memberId);
    await Notification.create({
      userId: loan.memberId,
      title: 'Repayment Recorded',
      message: `A repayment of ₹${repayAmount} has been recorded for your loan ${loan.loanId}. Outstanding balance: ₹${loan.outstandingBalance}.`,
      type: 'success',
      link: `/member/loans/${loan._id}`
    });

    if (loan.status === 'completed') {
      await Notification.create({
        userId: loan.memberId,
        title: 'Loan Completed! 🎉',
        message: `Congratulations! Your loan ${loan.loanId} has been fully repaid.`,
        type: 'success',
        link: `/member/loans/${loan._id}`
      });
    }

    req.session.success = `Repayment of ₹${repayAmount} recorded successfully.${loan.status === 'completed' ? ' Loan is now fully repaid!' : ''}`;
    res.redirect('/admin/repayments');
  } catch (error) {
    console.error('Record repayment error:', error);
    req.session.error = 'Failed to record repayment.';
    res.redirect('/admin/repayments');
  }
};
