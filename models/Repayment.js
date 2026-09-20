const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema({
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
  installmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Installment',
    default: null
  },
  amount: {
    type: Number,
    required: [true, 'Repayment amount is required'],
    min: [1, 'Repayment must be at least ₹1']
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'other'],
    default: 'cash'
  },
  notes: {
    type: String,
    default: ''
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

repaymentSchema.index({ loanId: 1 });
repaymentSchema.index({ memberId: 1 });

module.exports = mongoose.model('Repayment', repaymentSchema);
