/* ============================================
   ArthSetu — Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
  // ---------- Sidebar Toggle (Mobile) ----------
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebar-close');

  if (sidebarToggle && sidebar) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    document.body.appendChild(overlay);

    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
      document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    });

    if (sidebarClose) {
      sidebarClose.addEventListener('click', function () {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
      });
    }

    overlay.addEventListener('click', function () {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    });
  }

  // ---------- Navbar Toggle (Mobile) ----------
  const navbarToggle = document.getElementById('navbar-toggle');
  const navbarNav = document.getElementById('navbar-nav');

  if (navbarToggle && navbarNav) {
    navbarToggle.addEventListener('click', function () {
      navbarNav.classList.toggle('open');
    });
  }

  // ---------- Toast Auto-Dismiss ----------
  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(function (toast) {
    setTimeout(function () {
      toast.style.animation = 'slideOutRight 0.4s ease forwards';
      setTimeout(function () {
        toast.remove();
      }, 400);
    }, 5000);
  });

  // Add slideOutRight animation
  const style = document.createElement('style');
  style.textContent = '@keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }';
  document.head.appendChild(style);

  // ---------- Form Loading States ----------
  const forms = document.querySelectorAll('form');
  forms.forEach(function (form) {
    form.addEventListener('submit', function () {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.classList.contains('no-loading')) {
        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="btn-loading"></span> Processing...';
        submitBtn.style.opacity = '0.7';

        // Add loading spinner style
        if (!document.getElementById('loading-style')) {
          const loadingStyle = document.createElement('style');
          loadingStyle.id = 'loading-style';
          loadingStyle.textContent = '.btn-loading { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 0.6s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }';
          document.head.appendChild(loadingStyle);
        }

        // Reset after 10 seconds in case of error
        setTimeout(function () {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
          submitBtn.style.opacity = '1';
        }, 10000);
      }
    });
  });

  // ---------- Mark Notification as Read (AJAX) ----------
  const notificationItems = document.querySelectorAll('.notification-item[data-id]');
  notificationItems.forEach(function (item) {
    item.addEventListener('click', function () {
      const id = this.getAttribute('data-id');
      if (id && this.classList.contains('unread')) {
        fetch('/notifications/' + id + '/read', { method: 'POST' })
          .then(function () {
            item.classList.remove('unread');
          })
          .catch(function () { /* silent fail */ });
      }
    });
  });

  // ---------- Smooth Scroll for Landing Page ----------
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Close mobile nav if open
        if (navbarNav) navbarNav.classList.remove('open');
      }
    });
  });

  // ---------- Confirm Delete / Dangerous Actions ----------
  document.querySelectorAll('[data-confirm]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (!confirm(this.getAttribute('data-confirm'))) {
        e.preventDefault();
      }
    });
  });
});
