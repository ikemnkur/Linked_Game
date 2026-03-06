/* ─── Game Module Index ───────────────────────────────── */
// Pages
export { default as GameAuth } from './pages/GameAuth';
export { default as LobbyPage } from './pages/LobbyPage';
export { default as GameScreen } from './pages/GameScreen';
export { default as PracticePage } from './pages/PracticePage';
export { default as StatsPage } from './pages/StatsPage';
export { default as ReviewPage } from './pages/ReviewPage';
export { default as RulesPage } from './pages/RulesPage';
export { default as SpectatePage } from './pages/SpectatePage';

// Components
export { default as BoardCanvas } from './BoardCanvas';

// Utilities
export { default as LinkedEngine } from './engine';
export { default as SocketClient } from './socket';
export { default as SoundManager } from './sound';
export { GameToastProvider, useGameToast, Toast } from './GameToast';
