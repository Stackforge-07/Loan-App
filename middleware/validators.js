const { body } = require('express-validator');

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9+\-\s()]{7,15}$/).withMessage('Please enter a valid phone number'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('role')
    .isIn(['member', 'admin']).withMessage('Invalid role selected')
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const savingsValidation = [
  body('memberId')
    .notEmpty().withMessage('Please select a member'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
  body('month')
    .notEmpty().withMessage('Month is required'),
  body('year')
    .notEmpty().withMessage('Year is required')
    .isInt({ min: 2020, max: 2100 }).withMessage('Invalid year')
];

const loanRequestValidation = [
  body('principalAmount')
    .notEmpty().withMessage('Loan amount is required')
    .isFloat({ min: 100 }).withMessage('Loan amount must be at least ₹100'),
  body('purpose')
    .notEmpty().withMessage('Purpose is required')
    .isIn(['education', 'medical', 'agriculture', 'business', 'household', 'emergency', 'other'])
    .withMessage('Invalid loan purpose'),
  body('tenure')
    .notEmpty().withMessage('Tenure is required')
    .isInt({ min: 1, max: 60 }).withMessage('Tenure must be between 1 and 60 months')
];

const repaymentValidation = [
  body('loanId')
    .notEmpty().withMessage('Loan is required'),
  body('memberId')
    .notEmpty().withMessage('Member is required'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['cash', 'upi', 'bank_transfer', 'cheque', 'other'])
    .withMessage('Invalid payment method')
];

module.exports = {
  registerValidation,
  loginValidation,
  savingsValidation,
  loanRequestValidation,
  repaymentValidation
};
