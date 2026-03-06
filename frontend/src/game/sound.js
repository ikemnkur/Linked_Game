/* ─── Sound Manager (React-friendly) ──────────────────── */

const SOUND_PATHS = {
  gameStart: '/assets/sounds/GameStart.mp3',
  move: '/assets/sounds/PieceMove.wav',
  capture: '/assets/sounds/capture.wav',
  hit: '/assets/sounds/hit.mp3',
  select: '/assets/sounds/select.wav',
  hurryUp: '/assets/sounds/hurryup.wav',
  win: '/assets/sounds/WinGame.wav',
  lose: '/assets/sounds/LoseGame.wav',
  draw: '/assets/sounds/DrawGame.wav',
  elimination: '/assets/sounds/Elimination.mp3',
  resign: '/assets/sounds/Resign.mp3',
};

let sounds = {};
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;
  for (const [name, path] of Object.entries(SOUND_PATHS)) {
    const audio = new Audio(path);
    audio.volume = 0.5;
    audio.load();
    sounds[name] = audio;
  }
}

let enabled = typeof localStorage !== 'undefined'
  ? localStorage.getItem('sound_enabled') !== 'false'
  : true;

export function play(soundName) {
  if (!enabled) return;
  init();
  if (!sounds[soundName]) return;

  try {
    const audio = sounds[soundName];
    audio.currentTime = 0;
    audio.play().catch(err => {
      console.log('Sound play failed:', err.message);
    });
  } catch (err) {
    console.log('Sound error:', err.message);
  }
}

export function setEnabled(value) {
  enabled = value;
  localStorage.setItem('sound_enabled', value ? 'true' : 'false');
}

export function isEnabled() {
  return enabled;
}

export function setVolume(soundName, volume) {
  init();
  if (sounds[soundName]) {
    sounds[soundName].volume = Math.max(0, Math.min(1, volume));
  }
}

export function setAllVolume(volume) {
  init();
  Object.values(sounds).forEach(audio => {
    audio.volume = Math.max(0, Math.min(1, volume));
  });
}

const SoundManager = { play, setEnabled, isEnabled, setVolume, setAllVolume };
export default SoundManager;
