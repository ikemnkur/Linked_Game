/* ─── App Router & Bootstrap ──────────────────────────── */

window.App = (() => {
  let currentCleanup = null;

  function navigate(path) {
    window.history.pushState({}, '', path);
    route();
  }

  function route() {
    // Cleanup previous page
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    const path = window.location.pathname;

    if (path === '/lobby') {
      LobbyPage.render();
      currentCleanup = LobbyPage.cleanup;
    } else if (path === '/practice') {
      PracticePage.render();
      currentCleanup = PracticePage.cleanup;
    } else if (path.startsWith('/game/')) {
      const gameId = path.split('/game/')[1];
      GamePage.render(gameId);
      currentCleanup = GamePage.cleanup;
    } else if (path === '/how-to-play' || path === '/rules') {
      RulesPage.render();
      currentCleanup = RulesPage.cleanup || null;
    } else {
      // Default: auth page
      AuthPage.render();
      currentCleanup = null;
    }
  }

  // Handle browser back/forward
  window.addEventListener('popstate', route);

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    SocketClient.connect();
    route();
  });

  return { navigate };
})();
