/* ─── Rules Page ──────────────────────────────────────── */

window.RulesPage = (() => {
  function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="rules-page">
        <div class="rules-header">
          <button id="back-btn" class="btn-secondary">← Back</button>
          <h1>How to Play Linked</h1>
        </div>

        <div class="rules-content card">
          <section class="rules-section">
            <h2>🎯 Objective</h2>
            <p>Be the first to occupy the <strong>center 4 squares</strong> of the board with at least <strong>3 of your pieces</strong> for <strong>2 consecutive turns</strong>.</p>
          </section>

          <section class="rules-section">
            <h2>🎲 Setup</h2>
            <ul>
              <li>8×8 checkerboard</li>
              <li>2-4 players: <span class="color-tag red">Red</span>, <span class="color-tag blue">Blue</span>, <span class="color-tag green">Green</span>, <span class="color-tag yellow">Yellow</span></li>
              <li>6 pieces per player, starting on their back row (edge of the board)</li>
              <li><strong>Red</strong> starts at the top, <strong>Blue</strong> at the bottom, <strong>Green</strong> on the left, <strong>Yellow</strong> on the right</li>
            </ul>
          </section>

          <section class="rules-section">
            <h2>🚶 Movement</h2>
            <div class="move-types">
              <div class="move-card">
                <h3>Walk (Orthogonal)</h3>
                <p><strong>Direction:</strong> Up, Down, Left, or Right (one square)</p>
                <p><strong>Condition:</strong> Target square must be empty</p>
              </div>
              <div class="move-card">
                <h3>Attack (Diagonal)</h3>
                <p><strong>Direction:</strong> Diagonal (one square)</p>
                <p><strong>Condition:</strong> Target square has an enemy piece</p>
                <p><strong>Effect:</strong> The enemy is <em>pushed</em> to the nearest free square that is NOT adjacent to your piece's starting position</p>
              </div>
              <div class="move-card">
                <h3>Hop (Diagonal)</h3>
                <p><strong>Direction:</strong> Diagonal (one square) over any piece</p>
                <p><strong>Condition:</strong> Landing square must be empty AND adjacent to one of your other pieces (it must connect you to your group)</p>
              </div>
              <div class="move-card">
                <h3>Long Hop (2-Square Diagonal)</h3>
                <p><strong>Direction:</strong> Two squares diagonally</p>
                <p><strong>Condition:</strong> Jump over an enemy piece in the middle, landing square empty, and landing connects to a friendly piece</p>
                <p><strong>Effect:</strong> Enemy piece stays in place (no capture)</p>
              </div>
            </div>
          </section>

          <section class="rules-section rules-highlight">
            <h2>🔗 Linking Rule (Core Mechanic)</h2>
            <p>This is what makes <em>Linked</em> unique:</p>
            <ul>
              <li>Every piece <strong>must</strong> be connected to at least one friendly piece</li>
              <li>Connection = any of the 8 surrounding squares (orthogonal or diagonal)</li>
              <li><strong>After every move</strong>, any piece that has NO friendly neighbors is <strong>unlinked</strong> and <strong>removed from the board</strong></li>
              <li>Plan carefully — a single move can cause a chain reaction of unlinked pieces!</li>
            </ul>
          </section>

          <section class="rules-section">
            <h2>👑 Winning</h2>
            <ol>
              <li>At the <strong>end of your turn</strong>, you must have at least <strong>3 pieces</strong> on the <strong>center 4 squares</strong></li>
              <li>Hold that position through <strong>one full round</strong> (all other players take their turns)</li>
              <li>If you still control the center at the start of your next turn → <strong>You win!</strong></li>
              <li>If you lose control (enemy pushes you off or you move), the countdown resets</li>
            </ol>
          </section>

          <section class="rules-section">
            <h2>⏱️ Timer Options</h2>
            <p>Game creators can optionally enable a timer:</p>
            <ul>
              <li><strong>Total Time:</strong> Each player gets X minutes for the entire game (chess-clock style)
              <br> * Elimination: When a player's time runs out, they are eliminated and their pieces are removed
              </li>
              <li><strong>Per Turn:</strong> Each move must be made within Y seconds (minimum 10s, resets each turn)
              <br> * Skip: When a player's time runs out, their turn is skipped and the opponent's turn begins
              </li>
            </ul>
          </section>

          <section class="rules-section">
            <h2>💡 Strategy Tips</h2>
            <ul>
              <li><strong>Stay connected</strong> — isolated pieces die! Keep your group tight.</li>
              <li><strong>Control the center</strong> — but don't commit too early or you'll be vulnerable to attacks.</li>
              <li><strong>Use attacks strategically</strong> — push enemies away from the center or break their formations.</li>
              <li><strong>Plan ahead</strong> — think about how your move affects not just you, but your opponents' next moves.</li>
              <li><strong>Practice mode</strong> — experiment with piece placement and test strategies before playing!</li>
            </ul>
          </section>

          <section class="rules-section">
            <h2>🎮 Practice Room</h2>
            <p>The practice room lets you freely place, move, and remove pieces of any color with no rules enforcement. Perfect for:</p>
            <ul>
              <li>Learning how pieces move</li>
              <li>Testing theories and strategies</li>
              <li>Understanding the linking mechanic</li>
              <li>Setting up specific board positions to analyze</li>
            </ul>
          </section>

          <div class="rules-footer">
            <button id="start-playing-btn">Start Playing</button>
            <button id="try-practice-btn" class="btn-secondary">Try Practice Room</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => {
      const user = getUser();
      window.App.navigate(user ? '/lobby' : '/');
    });
    document.getElementById('start-playing-btn').addEventListener('click', () => {
      const user = getUser();
      window.App.navigate(user ? '/lobby' : '/');
    });
    document.getElementById('try-practice-btn').addEventListener('click', () => {
      window.App.navigate('/practice');
    });
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('linked_user')); } catch { return null; }
  }

  function cleanup() {
    // No cleanup needed for rules page
  }

  return { render, cleanup };
})();
