const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  groupId: {
    type: String,
    unique: true
  },
  leaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Auto-generate groupId before saving
groupSchema.pre('save', async function(next) {
  if (!this.groupId) {
    const count = await mongoose.model('Group').countDocuments();
    this.groupId = `SHG-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Group', groupSchema);
