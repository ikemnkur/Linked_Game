/* ─── Socket.IO Client Wrapper ────────────────────────── */

window.SocketClient = (() => {
  let socket = null;

  function connect() {
    if (!socket) {
      socket = io();
    }
    return socket;
  }

  function getSocket() {
    return socket || connect();
  }

  function joinGame(gameId) {
    getSocket().emit('game:join', gameId);
  }

  function sendMove(gameId, userId, from, to) {
    getSocket().emit('game:move', { gameId, userId, from, to });
  }

  function requestResign(gameId, userId) {
    getSocket().emit('game:resign', { gameId, userId });
  }

  function requestDraw(gameId, userId) {
    getSocket().emit('game:requestDraw', { gameId, userId });
  }

  function onLobbyUpdate(fn) {
    getSocket().on('lobby:update', fn);
  }

  function onGameUpdate(fn) {
    getSocket().on('game:update', fn);
  }

  function onMoveError(fn) {
    getSocket().on('game:moveError', fn);
  }

  function onTimerTick(fn) {
    getSocket().on('game:timerTick', fn);
  }

  function onDrawRequested(fn) {
    getSocket().on('game:drawRequested', fn);
  }

  function off(event, handler) {
    if (socket) {
      socket.off(event, handler);
    }
  }

  function offAll() {
    if (socket) {
      socket.off('lobby:update');
      socket.off('game:update');
      socket.off('game:moveError');
      socket.off('game:timerTick');
      socket.off('game:drawRequested');
    }
  }

  return { connect, getSocket, joinGame, sendMove, requestResign, requestDraw, onLobbyUpdate, onGameUpdate, onMoveError, onTimerTick, onDrawRequested, off, offAll };
})();
