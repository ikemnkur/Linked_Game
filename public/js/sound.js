/* ─── Sound Manager ───────────────────────────────────── */

window.SoundManager = (() => {
  const sounds = {
    gameStart: new Audio('/assets/sounds/GameStart.mp3'),
    move: new Audio('/assets/sounds/PieceMove.wav'),
    capture: new Audio('/assets/sounds/capture.wav'),
    hit: new Audio('/assets/sounds/hit.mp3'),
    select: new Audio('/assets/sounds/select.wav'),
    hurryUp: new Audio('/assets/sounds/hurryup.wav'),
    win: new Audio('/assets/sounds/WinGame.wav'),
    lose: new Audio('/assets/sounds/LoseGame.wav'),
    draw: new Audio('/assets/sounds/DrawGame.wav'),
    elimination: new Audio('/assets/sounds/Elimination.mp3'),
    resign: new Audio('/assets/sounds/Resign.mp3'),
  };

  // Preload all sounds
  Object.values(sounds).forEach(audio => {
    audio.volume = 0.5; // Default volume
    audio.load();
  });

  let enabled = localStorage.getItem('sound_enabled') !== 'false'; // enabled by default

  function play(soundName) {
    if (!enabled || !sounds[soundName]) return;
    
    try {
      const audio = sounds[soundName];
      audio.currentTime = 0; // Reset to start
      audio.play().catch(err => {
        console.log('Sound play failed:', err.message);
      });
    } catch (err) {
      console.log('Sound error:', err.message);
    }
  }

  function setEnabled(value) {
    enabled = value;
    localStorage.setItem('sound_enabled', value ? 'true' : 'false');
  }

  function isEnabled() {
    return enabled;
  }

  function setVolume(soundName, volume) {
    if (sounds[soundName]) {
      sounds[soundName].volume = Math.max(0, Math.min(1, volume));
    }
  }

  function setAllVolume(volume) {
    Object.values(sounds).forEach(audio => {
      audio.volume = Math.max(0, Math.min(1, volume));
    });
  }

  return {
    play,
    setEnabled,
    isEnabled,
    setVolume,
    setAllVolume,
  };
})();
