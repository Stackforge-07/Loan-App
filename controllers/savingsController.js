const SavingsTransaction = require('../models/SavingsTransaction');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');

// GET /admin/savings
exports.getSavings = async (req, res) => {
  try {
    const adminUser = await User.findById(req.session.user._id);
    const groupId = adminUser.groupId;

    // Get members for dropdown
    let members = [];
    if (groupId) {
      members = await User.find({ groupId, role: 'member', status: 'active' }).sort({ name: 1 });
    }

    // Get savings history
    const { memberId, month, year } = req.query;
    let filter = {};
    if (groupId) filter.groupId = groupId;
    if (memberId) filter.memberId = memberId;
    if (month) filter.month = month;
    if (year) filter.year = parseInt(year);

    const savings = await SavingsTransaction.find(filter)
      .populate('memberId', 'name email')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    // Group total savings
    const mongoose = require('mongoose');
    const totalAgg = await SavingsTransaction.aggregate([
      { $match: groupId ? { groupId: new mongoose.Types.ObjectId(groupId) } : {} },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const groupTotalSavings = totalAgg.length > 0 ? totalAgg[0].total : 0;

    res.render('admin/savings', {
      title: 'Savings Management — ArthSetu',
      members,
      savings,
      groupTotalSavings,
      filterMemberId: memberId || '',
      filterMonth: month || '',
      filterYear: year || ''
    });
  } catch (error) {
    console.error('Savings page error:', error);
    req.session.error = 'Failed to load savings page.';
    res.redirect('/admin/dashboard');
  }
};

// POST /admin/savings
exports.recordSavings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.error = errors.array().map(e => e.msg).join(', ');
      return res.redirect('/admin/savings');
    }

    const { memberId, amount, month, year, date } = req.body;
    const adminUser = await User.findById(req.session.user._id);
    const member = await User.findById(memberId);

    if (!member) {
      req.session.error = 'Member not found.';
      return res.redirect('/admin/savings');
    }

    // Check for duplicate contribution
    const existing = await SavingsTransaction.findOne({
      memberId,
      month,
      year: parseInt(year)
    });

    if (existing) {
      req.session.error = `Contribution for ${month} ${year} has already been recorded for this member.`;
      return res.redirect('/admin/savings');
    }

    // Calculate running balance
    const mongoose = require('mongoose');
    const prevTotal = await SavingsTransaction.aggregate([
      { $match: { memberId: new mongoose.Types.ObjectId(memberId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const previousBalance = prevTotal.length > 0 ? prevTotal[0].total : 0;
    const runningBalance = previousBalance + parseFloat(amount);

    const transaction = new SavingsTransaction({
      memberId,
      groupId: adminUser.groupId || member.groupId,
      amount: parseFloat(amount),
      month,
      year: parseInt(year),
      date: date ? new Date(date) : new Date(),
      runningBalance,
      recordedBy: req.session.user._id
    });
    await transaction.save();

    // Update member's totalSavings
    member.totalSavings = runningBalance;
    await member.save();

    // Notify member
    await Notification.create({
      userId: memberId,
      title: 'Savings Recorded',
      message: `Your savings contribution of ₹${amount} for ${month} ${year} has been recorded. Your total savings: ₹${runningBalance}.`,
      type: 'success',
      link: '/member/savings'
    });

    req.session.success = `Savings of ₹${amount} recorded for ${member.name}.`;
    res.redirect('/admin/savings');
  } catch (error) {
    console.error('Record savings error:', error);
    req.session.error = 'Failed to record savings.';
    res.redirect('/admin/savings');
  }
};
