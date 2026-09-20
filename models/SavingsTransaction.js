const mongoose = require('mongoose');

const savingsTransactionSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Contribution amount is required'],
    min: [1, 'Contribution must be at least ₹1']
  },
  month: {
    type: String,
    required: [true, 'Month is required']
  },
  year: {
    type: Number,
    required: [true, 'Year is required']
  },
  date: {
    type: Date,
    default: Date.now
  },
  runningBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
savingsTransactionSchema.index({ memberId: 1, year: -1, month: -1 });
savingsTransactionSchema.index({ groupId: 1 });

module.exports = mongoose.model('SavingsTransaction', savingsTransactionSchema);
