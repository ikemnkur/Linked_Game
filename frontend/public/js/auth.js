/* ─── Auth Page ───────────────────────────────────────── */
/* KEY FIX: Auth always allows retries after failed login. */
/* The form is never disabled/locked after an error.       */

window.AuthPage = (() => {
  function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="auth-page">
        <div class="logo">♟🔗♟</div>
        <h1>Linked</h1>
        <p class="subtitle">A 4-player strategy board game</p>
        <form id="auth-form">
          <input type="text" id="username-input" placeholder="Username (required)" maxlength="20" autofocus />
          <input type="password" id="password-input" placeholder="Password (optional - for account security)" maxlength="50" />
          <input type="email" id="email-input" placeholder="Email (optional)" maxlength="100" />
          <button type="submit">Enter Game</button>
          <p class="error-msg" id="auth-error"></p>
        </form>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">
          New users will be created automatically. Existing users with passwords must enter their password.
        </p>
        <a href="/rules" class="rules-link" onclick="event.preventDefault(); window.App.navigate('/rules');">How to Play →</a>
      </div>
    `;

    const form = document.getElementById('auth-form');
    const input = document.getElementById('username-input');
    const errorEl = document.getElementById('auth-error');

    // Pre-fill from localStorage if returning user
    const saved = localStorage.getItem('linked_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user && user.username) {
             input.value = user.username;
        }
           
      } catch {}
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';

      const username = input.value.trim();
      const password = document.getElementById('password-input').value.trim();
      const email = document.getElementById('email-input').value.trim();

      if (!username) {
        errorEl.textContent = 'Please enter a username.';
        // ▶ Input stays enabled — user can retry immediately
        return;
      }

      const btn = form.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Signing in…';

      try {
        const body = { username };
        if (password) body.password = password;
        if (email) body.email = email;

        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          errorEl.textContent = data.error || 'Something went wrong.';
          // ▶ Re-enable button so the user can retry
          btn.disabled = false;
          btn.textContent = 'Enter Game';
          return;
        }

        // Success — save user and navigate
        localStorage.setItem('linked_user', JSON.stringify(data.user));
        window.App.navigate('/lobby');
      } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
        // ▶ Re-enable button so the user can retry
        btn.disabled = false;
        btn.textContent = 'Enter Game';
      }
    });
  }

  return { render };
})();
