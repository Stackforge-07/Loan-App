const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  installmentNumber: {
    type: Number,
    required: true,
    min: 1
  },
  dueDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'partially_paid'],
    default: 'pending'
  },
  paidAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index
installmentSchema.index({ loanId: 1, installmentNumber: 1 });
installmentSchema.index({ memberId: 1, status: 1 });
installmentSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Installment', installmentSchema);
