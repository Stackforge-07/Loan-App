/**
 * ArthSetu — Seed Script
 * Creates demo data for testing
 *
 * Run: node seed/seed.js
 *
 * DEMO CREDENTIALS:
 * Admin:  admin@arthsetu.com / Admin@123
 * Member: priya@arthsetu.com / Member@123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Group = require('../models/Group');
const SavingsTransaction = require('../models/SavingsTransaction');
const Loan = require('../models/Loan');
const Installment = require('../models/Installment');
const Repayment = require('../models/Repayment');
const Notification = require('../models/Notification');

const MONGODB_URI = process.env.MONGODB_URI;

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September'];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear all collections
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Group.deleteMany({});
    await SavingsTransaction.deleteMany({});
    await Loan.deleteMany({});
    await Installment.deleteMany({});
    await Repayment.deleteMany({});
    await Notification.deleteMany({});

    // Create Admin
    console.log('👤 Creating admin...');
    const admin = await User.create({
      name: 'Rajesh Kumar',
      email: 'admin@arthsetu.com',
      password: 'Admin@123',
      phone: '9876543210',
      role: 'admin',
      address: 'Jaipur, Rajasthan',
      status: 'active'
    });

    // Create Group
    console.log('🏘️  Creating group...');
    const group = await Group.create({
      name: 'Shakti Self-Help Group',
      leaderId: admin._id,
      location: 'Jaipur, Rajasthan',
      description: 'A self-help group dedicated to empowering women through savings and micro-loans.'
    });

    admin.groupId = group._id;
    await admin.save();

    // Create Members
    console.log('👥 Creating members...');
    const memberData = [
      { name: 'Priya Sharma', email: 'priya@arthsetu.com', phone: '9876543211', address: 'Sanganer, Jaipur' },
      { name: 'Anita Devi', email: 'anita@arthsetu.com', phone: '9876543212', address: 'Amber, Jaipur' },
      { name: 'Sunita Meena', email: 'sunita@arthsetu.com', phone: '9876543213', address: 'Tonk Road, Jaipur' },
      { name: 'Kavita Yadav', email: 'kavita@arthsetu.com', phone: '9876543214', address: 'Malviya Nagar, Jaipur' },
      { name: 'Geeta Kumari', email: 'geeta@arthsetu.com', phone: '9876543215', address: 'Mansarovar, Jaipur' },
      { name: 'Meena Rathore', email: 'meena@arthsetu.com', phone: '9876543216', address: 'Vaishali, Jaipur' },
      { name: 'Lakshmi Joshi', email: 'lakshmi@arthsetu.com', phone: '9876543217', address: 'Pratap Nagar, Jaipur' },
    ];

    const members = [];
    for (const data of memberData) {
      const member = await User.create({
        ...data,
        password: 'Member@123',
        role: 'member',
        groupId: group._id,
        status: 'active'
      });
      members.push(member);
    }

    // Create Savings Transactions (6 months per member)
    console.log('💰 Creating savings transactions...');
    for (const member of members) {
      let runningBalance = 0;
      for (let i = 0; i < 6; i++) {
        const amount = [500, 500, 500, 1000, 500, 500][i];
        runningBalance += amount;

        await SavingsTransaction.create({
          memberId: member._id,
          groupId: group._id,
          amount,
          month: months[i],
          year: 2026,
          date: new Date(2026, i, 15),
          runningBalance,
          recordedBy: admin._id
        });
      }
      member.totalSavings = runningBalance;
      await member.save();
    }

    // Create Loans
    console.log('📋 Creating loans...');

    // Loan 1: Active (partially paid) - Priya
    const loan1 = await Loan.create({
      loanId: 'LOAN-00001',
      memberId: members[0]._id,
      groupId: group._id,
      principalAmount: 20000,
      purpose: 'education',
      tenure: 10,
      interestRate: 5,
      totalPayable: 20833,
      amountPaid: 8333,
      outstandingBalance: 12500,
      status: 'partially_paid',
      requestedAt: new Date(2026, 2, 1),
      approvedAt: new Date(2026, 2, 5),
      disbursedAt: new Date(2026, 2, 10)
    });

    // Generate installments for Loan 1
    const emiAmount1 = Math.floor(20833 / 10);
    for (let i = 1; i <= 10; i++) {
      const dueDate = new Date(2026, 2 + i, 1);
      await Installment.create({
        loanId: loan1._id,
        memberId: members[0]._id,
        installmentNumber: i,
        dueDate,
        amount: i === 10 ? 20833 - (emiAmount1 * 9) : emiAmount1,
        paidAmount: i <= 4 ? emiAmount1 : 0,
        status: i <= 4 ? 'paid' : (dueDate < new Date() ? 'overdue' : 'pending'),
        paidAt: i <= 4 ? new Date(2026, 2 + i, 5) : null
      });
    }

    // Repayments for Loan 1
    for (let i = 1; i <= 4; i++) {
      await Repayment.create({
        loanId: loan1._id,
        memberId: members[0]._id,
        amount: emiAmount1,
        paymentDate: new Date(2026, 2 + i, 5),
        paymentMethod: 'cash',
        notes: `Installment ${i} payment`,
        recordedBy: admin._id
      });
    }

    // Loan 2: Completed - Anita
    const loan2 = await Loan.create({
      loanId: 'LOAN-00002',
      memberId: members[1]._id,
      groupId: group._id,
      principalAmount: 10000,
      purpose: 'medical',
      tenure: 5,
      interestRate: 0,
      totalPayable: 10000,
      amountPaid: 10000,
      outstandingBalance: 0,
      status: 'completed',
      requestedAt: new Date(2026, 0, 10),
      approvedAt: new Date(2026, 0, 12),
      disbursedAt: new Date(2026, 0, 15),
      completedAt: new Date(2026, 5, 5)
    });

    for (let i = 1; i <= 5; i++) {
      await Installment.create({
        loanId: loan2._id,
        memberId: members[1]._id,
        installmentNumber: i,
        dueDate: new Date(2026, i, 1),
        amount: 2000,
        paidAmount: 2000,
        status: 'paid',
        paidAt: new Date(2026, i, 3)
      });
      await Repayment.create({
        loanId: loan2._id,
        memberId: members[1]._id,
        amount: 2000,
        paymentDate: new Date(2026, i, 3),
        paymentMethod: i % 2 === 0 ? 'upi' : 'cash',
        recordedBy: admin._id
      });
    }

    // Loan 3: Requested (pending) - Kavita
    await Loan.create({
      loanId: 'LOAN-00003',
      memberId: members[3]._id,
      groupId: group._id,
      principalAmount: 15000,
      purpose: 'business',
      tenure: 8,
      interestRate: 5,
      totalPayable: 15500,
      amountPaid: 0,
      outstandingBalance: 15500,
      status: 'requested',
      requestedAt: new Date(),
      notes: 'Need funds to purchase sewing machine for tailoring business.'
    });

    // Create Notifications
    console.log('🔔 Creating notifications...');
    await Notification.create([
      { userId: members[0]._id, title: 'Loan Approved', message: 'Your loan of ₹20,000 for education has been approved.', type: 'success', link: `/member/loans/${loan1._id}` },
      { userId: members[0]._id, title: 'Loan Disbursed', message: 'Your loan has been disbursed. First installment due next month.', type: 'success', link: `/member/loans/${loan1._id}` },
      { userId: members[0]._id, title: 'Repayment Recorded', message: 'A repayment of ₹2,083 has been recorded.', type: 'success' },
      { userId: members[1]._id, title: 'Loan Completed! 🎉', message: 'Congratulations! Your loan has been fully repaid.', type: 'success' },
      { userId: members[3]._id, title: 'Loan Request Submitted', message: 'Your loan request of ₹15,000 has been submitted for review.', type: 'info' },
      { userId: admin._id, title: 'New Loan Request', message: 'Kavita Yadav has requested a loan of ₹15,000 for business.', type: 'info', link: '/admin/loans' },
      { userId: admin._id, title: 'Repayment Recorded', message: 'Repayment of ₹2,083 recorded for Priya Sharma.', type: 'success' }
    ]);

    console.log('\n✅ ============================================');
    console.log('   SEED COMPLETED SUCCESSFULLY!');
    console.log('   ============================================');
    console.log('\n   📧 Demo Credentials:');
    console.log('   ─────────────────────────────────────');
    console.log('   Admin:   admin@arthsetu.com / Admin@123');
    console.log('   Member:  priya@arthsetu.com / Member@123');
    console.log('   ─────────────────────────────────────');
    console.log('\n   📊 Seeded Data:');
    console.log('   • 1 Admin (Group Leader)');
    console.log('   • 1 Self-Help Group');
    console.log('   • 7 Members');
    console.log('   • 42 Savings Transactions');
    console.log('   • 3 Loans (active, completed, pending)');
    console.log('   • 15 Installments');
    console.log('   • 9 Repayments');
    console.log('   • 7 Notifications');
    console.log('\n   ⚠️  This is DEMO data for testing only.\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
