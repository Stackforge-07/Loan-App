const User = require('../models/User');
const Group = require('../models/Group');
const SavingsTransaction = require('../models/SavingsTransaction');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const Repayment = require('../models/Repayment');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// GET /admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const adminUser = await User.findById(req.session.user._id);
    const groupId = adminUser.groupId;

    let groupFilter = {};
    if (groupId) {
      groupFilter = { groupId };
    }

    // Stats
    const totalMembers = await User.countDocuments({ ...groupFilter, role: 'member', status: 'active' });

    const savingsAgg = await SavingsTransaction.aggregate([
      { $match: groupId ? { groupId: new mongoose.Types.ObjectId(groupId) } : {} },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalGroupSavings = savingsAgg.length > 0 ? savingsAgg[0].total : 0;

    const loansDisbursedAgg = await Loan.aggregate([
      { $match: { ...groupFilter, status: { $in: ['disbursed', 'active', 'partially_paid', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$principalAmount' }, count: { $sum: 1 } } }
    ]);
    const loansDisbursed = loansDisbursedAgg.length > 0 ? loansDisbursedAgg[0].total : 0;
    const loansDisbursedCount = loansDisbursedAgg.length > 0 ? loansDisbursedAgg[0].count : 0;

    const recoveredAgg = await Repayment.aggregate([
      { $match: groupFilter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const amountRecovered = recoveredAgg.length > 0 ? recoveredAgg[0].total : 0;

    const outstandingAgg = await Loan.aggregate([
      { $match: { ...groupFilter, status: { $in: ['disbursed', 'active', 'partially_paid'] } } },
      { $group: { _id: null, total: { $sum: '$outstandingBalance' } } }
    ]);
    const outstandingLoans = outstandingAgg.length > 0 ? outstandingAgg[0].total : 0;

    const pendingRequests = await Loan.countDocuments({ ...groupFilter, status: 'requested' });

    // Chart data — Monthly savings trend (last 12 months)
    const monthlySavings = await SavingsTransaction.aggregate([
      { $match: groupId ? { groupId: new mongoose.Types.ObjectId(groupId) } : {} },
      {
        $group: {
          _id: { year: '$year', month: '$month' },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Loan status distribution
    const loanStatusDist = await Loan.aggregate([
      { $match: groupFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Monthly repayment collection
    const monthlyRepayments = await Repayment.aggregate([
      { $match: groupFilter },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard — ArthSetu',
      totalMembers,
      totalGroupSavings,
      loansDisbursed,
      loansDisbursedCount,
      amountRecovered,
      outstandingLoans,
      pendingRequests,
      monthlySavings: JSON.stringify(monthlySavings),
      loanStatusDist: JSON.stringify(loanStatusDist),
      monthlyRepayments: JSON.stringify(monthlyRepayments)
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.session.error = 'Failed to load dashboard.';
    res.redirect('/');
  }
};

// GET /admin/groups
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('leaderId', 'name email')
      .sort({ createdAt: -1 });

    // Get member counts for each group
    const groupsWithCounts = await Promise.all(groups.map(async (group) => {
      const memberCount = await User.countDocuments({ groupId: group._id, role: 'member', status: 'active' });
      const savingsAgg = await SavingsTransaction.aggregate([
        { $match: { groupId: group._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      return {
        ...group.toObject(),
        memberCount,
        totalSavings: savingsAgg.length > 0 ? savingsAgg[0].total : 0
      };
    }));

    res.render('admin/groups', {
      title: 'Groups — ArthSetu',
      groups: groupsWithCounts
    });
  } catch (error) {
    console.error('Groups error:', error);
    req.session.error = 'Failed to load groups.';
    res.redirect('/admin/dashboard');
  }
};

// POST /admin/groups
exports.createGroup = async (req, res) => {
  try {
    const { name, location, description } = req.body;
    const group = new Group({
      name: name.trim(),
      leaderId: req.session.user._id,
      location: location ? location.trim() : '',
      description: description ? description.trim() : ''
    });
    await group.save();

    // Update admin's groupId if not set
    const admin = await User.findById(req.session.user._id);
    if (!admin.groupId) {
      admin.groupId = group._id;
      await admin.save();
      req.session.user.groupId = group._id;
    }

    req.session.success = 'Group created successfully.';
    res.redirect('/admin/groups');
  } catch (error) {
    console.error('Create group error:', error);
    req.session.error = 'Failed to create group.';
    res.redirect('/admin/groups');
  }
};

// GET /admin/groups/:id
exports.getGroupDetail = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('leaderId', 'name email');
    if (!group) {
      return res.status(404).render('errors/404', { title: 'Group Not Found' });
    }

    const members = await User.find({ groupId: group._id, role: 'member' }).sort({ name: 1 });
    const memberCount = members.length;

    const savingsAgg = await SavingsTransaction.aggregate([
      { $match: { groupId: group._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalSavings = savingsAgg.length > 0 ? savingsAgg[0].total : 0;

    res.render('admin/group-detail', {
      title: `${group.name} — ArthSetu`,
      group,
      members,
      memberCount,
      totalSavings
    });
  } catch (error) {
    console.error('Group detail error:', error);
    req.session.error = 'Failed to load group details.';
    res.redirect('/admin/groups');
  }
};

// POST /admin/groups/:id/edit
exports.updateGroup = async (req, res) => {
  try {
    const { name, location, description } = req.body;
    await Group.findByIdAndUpdate(req.params.id, {
      name: name.trim(),
      location: location ? location.trim() : '',
      description: description ? description.trim() : ''
    });
    req.session.success = 'Group updated successfully.';
    res.redirect(`/admin/groups/${req.params.id}`);
  } catch (error) {
    console.error('Update group error:', error);
    req.session.error = 'Failed to update group.';
    res.redirect('/admin/groups');
  }
};

// GET /admin/members
exports.getMembers = async (req, res) => {
  try {
    const adminUser = await User.findById(req.session.user._id);
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const { search, status: filterStatus } = req.query;

    let filter = { role: 'member' };
    if (adminUser.groupId) {
      filter.groupId = adminUser.groupId;
    }
    if (filterStatus) {
      filter.status = filterStatus;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(filter);
    const members = await User.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    // Get each member's financial summary
    const membersWithData = await Promise.all(members.map(async (member) => {
      const savingsAgg = await SavingsTransaction.aggregate([
        { $match: { memberId: member._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const activeLoan = await Loan.findOne({
        memberId: member._id,
        status: { $in: ['disbursed', 'active', 'partially_paid'] }
      });

      return {
        ...member.toObject(),
        totalSavings: savingsAgg.length > 0 ? savingsAgg[0].total : 0,
        currentLoan: activeLoan ? activeLoan.totalPayable : 0,
        outstandingBalance: activeLoan ? activeLoan.outstandingBalance : 0
      };
    }));

    const totalPages = Math.ceil(total / limit);

    res.render('admin/members', {
      title: 'Members — ArthSetu',
      members: membersWithData,
      currentPage: page,
      totalPages,
      total,
      search: search || '',
      filterStatus: filterStatus || ''
    });
  } catch (error) {
    console.error('Members error:', error);
    req.session.error = 'Failed to load members.';
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/members/:id
exports.getMemberDetail = async (req, res) => {
  try {
    const member = await User.findById(req.params.id).populate('groupId');
    if (!member) {
      return res.status(404).render('errors/404', { title: 'Member Not Found' });
    }

    const savingsAgg = await SavingsTransaction.aggregate([
      { $match: { memberId: member._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalSavings = savingsAgg.length > 0 ? savingsAgg[0].total : 0;

    const savings = await SavingsTransaction.find({ memberId: member._id })
      .sort({ year: -1, createdAt: -1 })
      .limit(12);

    const loans = await Loan.find({ memberId: member._id }).sort({ createdAt: -1 });

    res.render('admin/member-detail', {
      title: `${member.name} — ArthSetu`,
      member,
      totalSavings,
      savings,
      loans
    });
  } catch (error) {
    console.error('Member detail error:', error);
    req.session.error = 'Failed to load member details.';
    res.redirect('/admin/members');
  }
};

// POST /admin/members/:id/toggle-status
exports.toggleMemberStatus = async (req, res) => {
  try {
    const member = await User.findById(req.params.id);
    if (!member) {
      req.session.error = 'Member not found.';
      return res.redirect('/admin/members');
    }
    member.status = member.status === 'active' ? 'inactive' : 'active';
    await member.save();
    req.session.success = `Member ${member.status === 'active' ? 'activated' : 'deactivated'} successfully.`;
    res.redirect('/admin/members');
  } catch (error) {
    console.error('Toggle member status error:', error);
    req.session.error = 'Failed to update member status.';
    res.redirect('/admin/members');
  }
};

// GET /admin/reports
exports.getReports = async (req, res) => {
  try {
    const adminUser = await User.findById(req.session.user._id);
    const groupId = adminUser.groupId;
    const { reportType, startDate, endDate, memberId } = req.query;

    let reportData = null;
    let members = [];

    if (groupId) {
      members = await User.find({ groupId, role: 'member', status: 'active' }).sort({ name: 1 });
    }

    if (reportType) {
      let dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      const groupFilter = groupId ? { groupId: new mongoose.Types.ObjectId(groupId) } : {};

      switch (reportType) {
        case 'savings':
          let savingsFilter = { ...groupFilter };
          if (startDate || endDate) savingsFilter.date = dateFilter;
          if (memberId) savingsFilter.memberId = new mongoose.Types.ObjectId(memberId);

          reportData = await SavingsTransaction.find(savingsFilter)
            .populate('memberId', 'name email')
            .populate('recordedBy', 'name')
            .sort({ date: -1 });
          break;

        case 'loans':
          let loanFilter = { ...groupFilter };
          if (memberId) loanFilter.memberId = new mongoose.Types.ObjectId(memberId);

          reportData = await Loan.find(loanFilter)
            .populate('memberId', 'name email')
            .sort({ requestedAt: -1 });
          break;

        case 'repayments':
          let repayFilter = { ...groupFilter };
          if (startDate || endDate) repayFilter.paymentDate = dateFilter;
          if (memberId) repayFilter.memberId = new mongoose.Types.ObjectId(memberId);

          reportData = await Repayment.find(repayFilter)
            .populate('memberId', 'name email')
            .populate('loanId', 'loanId principalAmount')
            .sort({ paymentDate: -1 });
          break;

        case 'outstanding':
          let outFilter = { ...groupFilter, status: { $in: ['disbursed', 'active', 'partially_paid'] } };
          if (memberId) outFilter.memberId = new mongoose.Types.ObjectId(memberId);

          reportData = await Loan.find(outFilter)
            .populate('memberId', 'name email')
            .sort({ outstandingBalance: -1 });
          break;
      }
    }

    res.render('admin/reports', {
      title: 'Reports — ArthSetu',
      reportType: reportType || '',
      reportData,
      members,
      startDate: startDate || '',
      endDate: endDate || '',
      memberId: memberId || ''
    });
  } catch (error) {
    console.error('Reports error:', error);
    req.session.error = 'Failed to load reports.';
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/reports/export
exports.exportReport = async (req, res) => {
  try {
    const adminUser = await User.findById(req.session.user._id);
    const groupId = adminUser.groupId;
    const { reportType } = req.query;

    const groupFilter = groupId ? { groupId: new mongoose.Types.ObjectId(groupId) } : {};
    let csv = '';

    switch (reportType) {
      case 'savings':
        const savings = await SavingsTransaction.find(groupFilter)
          .populate('memberId', 'name email')
          .populate('recordedBy', 'name')
          .sort({ date: -1 });

        csv = 'Date,Member,Email,Month,Year,Amount,Running Balance,Recorded By\n';
        savings.forEach(s => {
          csv += `${new Date(s.date).toLocaleDateString()},${s.memberId?.name || 'N/A'},${s.memberId?.email || 'N/A'},${s.month},${s.year},${s.amount},${s.runningBalance},${s.recordedBy?.name || 'N/A'}\n`;
        });
        break;

      case 'loans':
        const loans = await Loan.find(groupFilter)
          .populate('memberId', 'name email')
          .sort({ requestedAt: -1 });

        csv = 'Loan ID,Member,Email,Principal,Interest Rate,Tenure,Total Payable,Amount Paid,Outstanding,Status,Purpose\n';
        loans.forEach(l => {
          csv += `${l.loanId},${l.memberId?.name || 'N/A'},${l.memberId?.email || 'N/A'},${l.principalAmount},${l.interestRate}%,${l.tenure} months,${l.totalPayable},${l.amountPaid},${l.outstandingBalance},${l.status},${l.purpose}\n`;
        });
        break;

      case 'repayments':
        const repayments = await Repayment.find(groupFilter)
          .populate('memberId', 'name email')
          .populate('loanId', 'loanId')
          .sort({ paymentDate: -1 });

        csv = 'Date,Member,Loan ID,Amount,Payment Method,Notes\n';
        repayments.forEach(r => {
          csv += `${new Date(r.paymentDate).toLocaleDateString()},${r.memberId?.name || 'N/A'},${r.loanId?.loanId || 'N/A'},${r.amount},${r.paymentMethod},${(r.notes || '').replace(/,/g, ';')}\n`;
        });
        break;

      default:
        req.session.error = 'Invalid report type.';
        return res.redirect('/admin/reports');
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=arthsetu_${reportType}_report.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    req.session.error = 'Failed to export report.';
    res.redirect('/admin/reports');
  }
};

// GET /admin/overdue
exports.getOverdue = async (req, res) => {
  try {
    const adminUser = await User.findById(req.session.user._id);

    // Update overdue installments
    await Installment.updateMany(
      { dueDate: { $lt: new Date() }, status: 'pending' },
      { $set: { status: 'overdue' } }
    );

    let filter = { status: 'overdue' };
    if (adminUser.groupId) {
      const memberIds = await User.find({ groupId: adminUser.groupId, role: 'member' }).distinct('_id');
      filter.memberId = { $in: memberIds };
    }

    const overdueInstallments = await Installment.find(filter)
      .populate('memberId', 'name email phone')
      .populate('loanId', 'loanId principalAmount outstandingBalance')
      .sort({ dueDate: 1 });

    // Calculate days overdue
    const overdueWithDays = overdueInstallments.map(inst => {
      const now = new Date();
      const due = new Date(inst.dueDate);
      const diffTime = Math.abs(now - due);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...inst.toObject(),
        daysOverdue: diffDays
      };
    });

    res.render('admin/overdue', {
      title: 'Overdue Repayments — ArthSetu',
      overdueInstallments: overdueWithDays
    });
  } catch (error) {
    console.error('Overdue error:', error);
    req.session.error = 'Failed to load overdue installments.';
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.session.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.render('admin/notifications', {
      title: 'Notifications — ArthSetu',
      notifications
    });
  } catch (error) {
    console.error('Notifications error:', error);
    req.session.error = 'Failed to load notifications.';
    res.redirect('/admin/dashboard');
  }
};
