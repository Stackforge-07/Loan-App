const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  loanId: {
    type: String,
    unique: true
  },
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
  principalAmount: {
    type: Number,
    required: [true, 'Loan amount is required'],
    min: [100, 'Loan amount must be at least ₹100']
  },
  purpose: {
    type: String,
    required: [true, 'Loan purpose is required'],
    enum: ['education', 'medical', 'agriculture', 'business', 'household', 'emergency', 'other']
  },
  tenure: {
    type: Number,
    required: [true, 'Loan tenure is required'],
    min: [1, 'Tenure must be at least 1 month'],
    max: [60, 'Tenure cannot exceed 60 months']
  },
  interestRate: {
    type: Number,
    default: 0,
    min: [0, 'Interest rate cannot be negative'],
    max: [36, 'Interest rate cannot exceed 36%']
  },
  totalPayable: {
    type: Number,
    default: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  outstandingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['requested', 'pending', 'approved', 'rejected', 'disbursed', 'active', 'partially_paid', 'completed'],
    default: 'requested'
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  disbursedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Auto-generate loanId before saving
loanSchema.pre('save', async function(next) {
  if (!this.loanId) {
    const count = await mongoose.model('Loan').countDocuments();
    this.loanId = `LOAN-${String(count + 1).padStart(5, '0')}`;
  }
  // Calculate total payable with simple interest
  if (this.isModified('principalAmount') || this.isModified('interestRate') || this.isModified('tenure')) {
    const interest = (this.principalAmount * this.interestRate * this.tenure) / (12 * 100);
    this.totalPayable = Math.round(this.principalAmount + interest);
    this.outstandingBalance = this.totalPayable - this.amountPaid;
  }
  next();
});

// Indexes
loanSchema.index({ memberId: 1, status: 1 });
loanSchema.index({ groupId: 1, status: 1 });

module.exports = mongoose.model('Loan', loanSchema);
