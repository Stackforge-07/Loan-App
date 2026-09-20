const User = require('../models/User');
const Group = require('../models/Group');
const { validationResult } = require('express-validator');

// GET /login
exports.getLogin = (req, res) => {
  res.render('auth/login', { title: 'Login — ArthSetu', errors: [] });
};

// POST /login
exports.postLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('auth/login', {
        title: 'Login — ArthSetu',
        errors: errors.array(),
        email: req.body.email
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.render('auth/login', {
        title: 'Login — ArthSetu',
        errors: [{ msg: 'Invalid email or password' }],
        email
      });
    }

    if (user.status === 'inactive') {
      return res.render('auth/login', {
        title: 'Login — ArthSetu',
        errors: [{ msg: 'Your account has been deactivated. Contact your group leader.' }],
        email
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Login — ArthSetu',
        errors: [{ msg: 'Invalid email or password' }],
        email
      });
    }

    // Create session
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      groupId: user.groupId
    };

    req.session.success = `Welcome back, ${user.name}!`;

    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/member/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    return res.render('auth/login', {
      title: 'Login — ArthSetu',
      errors: [{ msg: 'An error occurred. Please try again.' }],
      email: req.body.email
    });
  }
};

// GET /register
exports.getRegister = async (req, res) => {
  try {
    const groups = await Group.find({ status: 'active' }).sort({ name: 1 });
    res.render('auth/register', { title: 'Register — ArthSetu', errors: [], groups });
  } catch (error) {
    res.render('auth/register', { title: 'Register — ArthSetu', errors: [], groups: [] });
  }
};

// POST /register
exports.postRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    const groups = await Group.find({ status: 'active' }).sort({ name: 1 });

    if (!errors.isEmpty()) {
      return res.render('auth/register', {
        title: 'Register — ArthSetu',
        errors: errors.array(),
        groups,
        body: req.body
      });
    }

    const { name, email, phone, password, role, address, groupId, groupName, location, description } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('auth/register', {
        title: 'Register — ArthSetu',
        errors: [{ msg: 'An account with this email already exists' }],
        groups,
        body: req.body
      });
    }

    if (role === 'admin') {
      // Create admin user first
      const adminUser = new User({
        name,
        email,
        password,
        phone,
        role: 'admin',
        address: address || ''
      });
      await adminUser.save();

      // Create group
      if (groupName) {
        const newGroup = new Group({
          name: groupName,
          leaderId: adminUser._id,
          location: location || '',
          description: description || ''
        });
        await newGroup.save();
        adminUser.groupId = newGroup._id;
        await adminUser.save();
      }

      req.session.user = {
        _id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        groupId: adminUser.groupId
      };

      req.session.success = 'Registration successful! Welcome to ArthSetu.';
      return res.redirect('/admin/dashboard');
    } else {
      // Member registration
      const member = new User({
        name,
        email,
        password,
        phone,
        role: 'member',
        address: address || '',
        groupId: groupId || null
      });
      await member.save();

      req.session.user = {
        _id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        groupId: member.groupId
      };

      req.session.success = 'Registration successful! Welcome to ArthSetu.';
      return res.redirect('/member/dashboard');
    }
  } catch (error) {
    console.error('Registration error:', error);
    const groups = await Group.find({ status: 'active' }).sort({ name: 1 });
    return res.render('auth/register', {
      title: 'Register — ArthSetu',
      errors: [{ msg: 'Registration failed. Please try again.' }],
      groups,
      body: req.body
    });
  }
};

// POST /logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
};

// GET /
exports.getLanding = (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/member/dashboard');
  }
  res.render('landing', { title: 'ArthSetu — Transparent Savings. Smarter Group Finance.' });
};
