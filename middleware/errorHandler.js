// Global error handler middleware

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack || err.message);

  const statusCode = err.statusCode || 500;

  if (statusCode === 401) {
    return res.status(401).render('errors/401', { title: 'Unauthorized' });
  }

  if (statusCode === 403) {
    return res.status(403).render('errors/403', { title: 'Access Denied' });
  }

  if (statusCode === 404) {
    return res.status(404).render('errors/404', { title: 'Page Not Found' });
  }

  res.status(statusCode).render('errors/500', {
    title: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

module.exports = errorHandler;
