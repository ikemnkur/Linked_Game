/* ─── Socket.IO Client Wrapper (React-friendly) ──────── */
import { io } from 'socket.io-client';

let socket = null;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export function connect() {
  if (!socket) {
    socket = io(BACKEND_URL);
  }
  return socket;
}

export function getSocket() {
  return socket || connect();
}

export function joinGame(gameId) {
  getSocket().emit('game:join', gameId);
}

export function sendMove(gameId, userId, from, to) {
  getSocket().emit('game:move', { gameId, userId, from, to });
}

export function requestResign(gameId, userId) {
  getSocket().emit('game:resign', { gameId, userId });
}

export function requestDraw(gameId, userId) {
  getSocket().emit('game:requestDraw', { gameId, userId });
}

export function onLobbyUpdate(fn) {
  getSocket().on('lobby:update', fn);
}

export function onGameUpdate(fn) {
  getSocket().on('game:update', fn);
}

export function onMoveError(fn) {
  getSocket().on('game:moveError', fn);
}

export function onTimerTick(fn) {
  getSocket().on('game:timerTick', fn);
}

export function onDrawRequested(fn) {
  getSocket().on('game:drawRequested', fn);
}

export function joinSpectate(gameId) {
  getSocket().emit('spectate:join', { gameId });
}

export function sendChatMessage(gameId, username, message) {
  getSocket().emit('spectate:chat:send', { gameId, username, message });
}

export function onChatMessage(fn) {
  getSocket().on('spectate:chat:msg', fn);
}

export function onChatHistory(fn) {
  getSocket().on('spectate:chat:history', fn);
}

export function off(event, handler) {
  if (socket) {
    socket.off(event, handler);
  }
}

export function offAll() {
  if (socket) {
    socket.off('lobby:update');
    socket.off('game:update');
    socket.off('game:moveError');
    socket.off('game:timerTick');
    socket.off('game:drawRequested');
    socket.off('spectate:chat:msg');
    socket.off('spectate:chat:history');
  }
}

const SocketClient = {
  connect,
  getSocket,
  joinGame,
  sendMove,
  requestResign,
  requestDraw,
  onLobbyUpdate,
  onGameUpdate,
  onMoveError,
  onTimerTick,
  onDrawRequested,
  joinSpectate,
  sendChatMessage,
  onChatMessage,
  onChatHistory,
  off,
  offAll,
};

export default SocketClient;
