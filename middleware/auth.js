// Authentication middleware

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.error = 'Please log in to access this page.';
  return res.redirect('/login');
};

const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).render('errors/403', { title: 'Access Denied' });
};

const isMember = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'member') {
    return next();
  }
  return res.status(403).render('errors/403', { title: 'Access Denied' });
};

const isGuest = (req, res, next) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/member/dashboard');
  }
  next();
};

module.exports = { isAuthenticated, isAdmin, isMember, isGuest };
