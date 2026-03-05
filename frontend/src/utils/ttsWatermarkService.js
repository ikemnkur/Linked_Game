/**
 * TTS Watermark Service
 * Handles generation and application of audio watermarks
 */

const TTS_SERVER_URL = 'http://localhost:5000/';

/**
 * Generate a TTS watermark for audio scrambling/unscrambling
 * @param {string} username - Username to embed in watermark
 * @param {string} type - 'scrambler' or 'unscrambler'
 * @param {object} options - Voice options (voice, rate, pitch)
 * @returns {Promise<string>} URL to the generated watermark audio file
 */
export async function generateWatermark(username, type = 'unscrambler', options = {}) {
  try {
    const {
      voice = 'en-US-GuyNeural',
      rate = '+10%',
      pitch = '+0Hz',
      silence_between = 150
    } = options;

    let intro = '';
    let id_text = '';
    let outro = '';

    if (type === 'scrambler') {
      intro = 'Protected audio by';
      id_text = username;
      outro = 'on scrambler dot com';
    } else if (type === 'unscrambler') {
      intro = 'Unscrambled by user';
      id_text = username;
      outro = 'on scrambler dot com';
    }

    const response = await fetch(`${TTS_SERVER_URL}/tts/generate-watermark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intro,
        id: id_text,
        outro,
        voice,
        rate,
        pitch,
        silence_between
      })
    });

    if (!response.ok) {
      throw new Error(`TTS Server error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate watermark');
    }

    // Return full URL to watermark audio
    return `${TTS_SERVER_URL}${result.url}`;
  } catch (error) {
    console.error('Error generating watermark:', error);
    throw error;
  }
}

/**
 * Load audio from URL and convert to AudioBuffer
 * @param {string} url - URL to audio file
 * @param {AudioContext} audioContext - Web Audio API context
 * @returns {Promise<AudioBuffer>} Decoded audio buffer
 */
export async function loadAudioFromUrl(url, audioContext) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (error) {
    console.error('Error loading audio from URL:', error);
    throw error;
  }
}

/**
 * Prepend watermark to audio (for scrambler - watermark at start)
 * @param {AudioBuffer} originalBuffer - Original audio buffer
 * @param {AudioBuffer} watermarkBuffer - Watermark audio buffer
 * @param {AudioContext} audioContext - Web Audio API context
 * @returns {AudioBuffer} Combined audio with watermark at start
 */
export function prependWatermark(originalBuffer, watermarkBuffer, audioContext) {
  const channels = originalBuffer.numberOfChannels;
  const sampleRate = originalBuffer.sampleRate;

  // Resample watermark if sample rates don't match
  const watermark = watermarkBuffer.sampleRate === sampleRate
    ? watermarkBuffer
    : resampleBuffer(watermarkBuffer, sampleRate, audioContext);

  const totalLength = watermark.length + originalBuffer.length;
  const combinedBuffer = audioContext.createBuffer(channels, totalLength, sampleRate);

  for (let channel = 0; channel < channels; channel++) {
    const combinedData = combinedBuffer.getChannelData(channel);
    const watermarkData = watermark.getChannelData(Math.min(channel, watermark.numberOfChannels - 1));
    const originalData = originalBuffer.getChannelData(channel);

    // Copy watermark
    combinedData.set(watermarkData, 0);

    // Copy original audio after watermark
    combinedData.set(originalData, watermark.length);
  }

  return combinedBuffer;
}

/**
 * Overlay watermark at regular intervals throughout audio (for unscrambler)
 * @param {AudioBuffer} originalBuffer - Original audio buffer
 * @param {AudioBuffer} watermarkBuffer - Watermark audio buffer
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {object} options - Overlay options
 * @returns {AudioBuffer} Audio with watermark overlays
 */
export function overlayWatermarkAtIntervals(originalBuffer, watermarkBuffer, audioContext, options = {}) {
  const {
    intervalSeconds = null, // Auto-calculate if null
    volume = 0.3, // Watermark volume (0.0 to 1.0)
    fadeMs = 200 // Fade in/out duration in milliseconds
  } = options;

  const channels = originalBuffer.numberOfChannels;
  const sampleRate = originalBuffer.sampleRate;
  const duration = originalBuffer.duration;

  // Resample watermark if needed
  const watermark = watermarkBuffer.sampleRate === sampleRate
    ? watermarkBuffer
    : resampleBuffer(watermarkBuffer, sampleRate, audioContext);

  // Calculate interval based on audio length
  let interval = intervalSeconds;
  if (interval === null) {
    if (duration <= 30) {
      interval = 15; // Every 15 seconds for short audio
    } else if (duration <= 120) {
      interval = 20; // Every 20 seconds for medium audio
    } else {
      interval = 15; // Every 15 seconds for long audio
    }
  }

  // Create output buffer (same length as original)
  const outputBuffer = audioContext.createBuffer(channels, originalBuffer.length, sampleRate);

  // Copy original audio
  for (let channel = 0; channel < channels; channel++) {
    const outputData = outputBuffer.getChannelData(channel);
    const originalData = originalBuffer.getChannelData(channel);
    outputData.set(originalData);
  }

  // Calculate positions to overlay watermark
  const intervalSamples = Math.floor(interval * sampleRate);
  const fadeSamples = Math.floor((fadeMs / 1000) * sampleRate);

  let position = 0;

  while (position + watermark.length < originalBuffer.length) {
    // Overlay watermark at this position
    for (let channel = 0; channel < channels; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      const watermarkData = watermark.getChannelData(Math.min(channel, watermark.numberOfChannels - 1));

      for (let i = 0; i < watermark.length && position + i < originalBuffer.length; i++) {
        let wmSample = watermarkData[i] * volume;

        // Apply fade in/out
        if (i < fadeSamples) {
          wmSample *= i / fadeSamples; // Fade in
        } else if (i > watermark.length - fadeSamples) {
          wmSample *= (watermark.length - i) / fadeSamples; // Fade out
        }

        // Mix with original audio
        outputData[position + i] += wmSample;

        // Prevent clipping
        outputData[position + i] = Math.max(-1, Math.min(1, outputData[position + i]));
      }
    }

    position += intervalSamples;
  }

  return outputBuffer;
}

/**
 * Simple resampling (basic implementation)
 * @param {AudioBuffer} buffer - Buffer to resample
 * @param {number} targetSampleRate - Target sample rate
 * @param {AudioContext} audioContext - Web Audio API context
 * @returns {AudioBuffer} Resampled buffer
 */
function resampleBuffer(buffer, targetSampleRate, audioContext) {
  const sourceSampleRate = buffer.sampleRate;
  const ratio = targetSampleRate / sourceSampleRate;
  const newLength = Math.round(buffer.length * ratio);
  const channels = buffer.numberOfChannels;

  const resampledBuffer = audioContext.createBuffer(channels, newLength, targetSampleRate);

  for (let channel = 0; channel < channels; channel++) {
    const sourceData = buffer.getChannelData(channel);
    const targetData = resampledBuffer.getChannelData(channel);

    for (let i = 0; i < newLength; i++) {
      const sourceIndex = i / ratio;
      const sourceIndexFloor = Math.floor(sourceIndex);
      const sourceIndexCeil = Math.min(sourceIndexFloor + 1, buffer.length - 1);
      const fraction = sourceIndex - sourceIndexFloor;

      // Linear interpolation
      targetData[i] = sourceData[sourceIndexFloor] * (1 - fraction) +
        sourceData[sourceIndexCeil] * fraction;
    }
  }

  return resampledBuffer;
}

/**
 * Check if TTS server is available
 * @returns {Promise<boolean>} True if server is available
 */
export async function checkTTSServerHealth() {
  try {
    const response = await fetch(`${TTS_SERVER_URL}/tts/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    return response.ok;
  } catch (error) {
    console.warn('TTS server not available:', error.message);
    return false;
  }
}

/**
 * Generate speech audio using Google Translate TTS API (via backend proxy)
 * @param {string} text - Text to convert to speech
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {object} options - TTS options
 * @returns {Promise<AudioBuffer>} Audio buffer with generated speech
 */
export async function useGoogleTTS(text, audioContext, options = {}) {
  try {
    const {
      language = 'en', // Language code (en, es, fr, etc.)
      speed = 1.0       // Speech speed (not directly supported by Google TTS)
    } = options;

    // Use backend proxy to bypass CORS
    const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001';
    const url = `${API_URL}/api/tts/google?text=${encodeURIComponent(text)}&language=${language}`;

    const response = await fetch(url, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `TTS request failed: ${response.status} ${response.statusText}`);
    }

    // Get audio data as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // Decode audio data to AudioBuffer
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    console.log('Google TTS audio generated:', {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels
    });

    return audioBuffer;
  } catch (error) {
    console.error('Error generating Google TTS:', error.message);
    throw error;
  }
}

/**
 * Generate watermark using Google TTS (fallback when TTS server is unavailable)
 * @param {string} username - Username to embed in watermark
 * @param {string} type - 'scrambler' or 'unscrambler'
 * @param {AudioContext} audioContext - Web Audio API context
 * @returns {Promise<AudioBuffer>} Watermark audio buffer
 */
export async function generateWatermarkWithGoogleTTS(username, type = 'unscrambler', audioContext) {
  try {
    let text = '';

    if (type === 'scrambler') {
      text = `Protected audio by ${username} on scrambler dot com`;
    } else if (type === 'unscrambler') {
      text = `Unscrambled by user ${username} on scrambler dot com`;
    }

    const watermarkBuffer = await useGoogleTTS(text, audioContext);
    return watermarkBuffer;
  } catch (error) {
    console.error('Error generating Google TTS watermark:', error);
    throw error;
  }
}

/**
 * Create a silent audio buffer
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {number} duration - Duration in seconds
 * @returns {AudioBuffer} Silent audio buffer
 */
function createSilenceBuffer(audioContext, duration) {
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  // Buffer is already filled with zeros (silence)
  return buffer;
}

/**
 * Speed up an audio buffer by resampling (makes it shorter)
 * @param {AudioBuffer} buffer - Buffer to speed up
 * @param {number} speedFactor - Speed multiplier (e.g., 1.25 = 25% faster)
 * @param {AudioContext} audioContext - Web Audio API context
 * @returns {AudioBuffer} Sped up buffer
 */
function speedUpBuffer(buffer, speedFactor, audioContext) {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const newLength = Math.floor(buffer.length / speedFactor);

  const speedBuffer = audioContext.createBuffer(channels, newLength, sampleRate);

  for (let channel = 0; channel < channels; channel++) {
    const sourceData = buffer.getChannelData(channel);
    const targetData = speedBuffer.getChannelData(channel);

    for (let i = 0; i < newLength; i++) {
      const sourceIndex = i * speedFactor;
      const sourceIndexFloor = Math.floor(sourceIndex);
      const sourceIndexCeil = Math.min(sourceIndexFloor + 1, buffer.length - 1);
      const fraction = sourceIndex - sourceIndexFloor;

      // Linear interpolation
      targetData[i] = sourceData[sourceIndexFloor] * (1 - fraction) +
        sourceData[sourceIndexCeil] * fraction;
    }
  }

  return speedBuffer;
}

/**
 * Concatenate two audio buffers
 * @param {AudioBuffer} buffer1 - First buffer
 * @param {AudioBuffer} buffer2 - Second buffer
 * @returns {AudioBuffer} Combined buffer
 */
function concatenateAudioBuffers(buffer1, buffer2) {
  if (!buffer1) return buffer2;
  if (!buffer2) return buffer1;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const channels = Math.max(buffer1.numberOfChannels, buffer2.numberOfChannels);
  const sampleRate = buffer1.sampleRate;
  const totalLength = buffer1.length + buffer2.length;

  const combinedBuffer = audioContext.createBuffer(channels, totalLength, sampleRate);

  for (let channel = 0; channel < channels; channel++) {
    const combinedData = combinedBuffer.getChannelData(channel);
    
    // Copy first buffer
    if (channel < buffer1.numberOfChannels) {
      const buffer1Data = buffer1.getChannelData(channel);
      combinedData.set(buffer1Data, 0);
    }
    
    // Copy second buffer
    if (channel < buffer2.numberOfChannels) {
      const buffer2Data = buffer2.getChannelData(channel);
      combinedData.set(buffer2Data, buffer1.length);
    }
  }

  return combinedBuffer;
}

/**
 * Spell out username character by character using audio clips
 * @param {string} username - Username to spell out
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {object} options - Spelling options
 * @returns {Promise<AudioBuffer>} Audio buffer with spelled username
 */
export async function spellOutUsername(username, audioContext, options = {}) {
  const {
    lettersPath = '/audio-alphabet',
    numbersPath = '/audio-numbers', 
    symbolsPath = '/audio-symbols',
    silenceDuration = 0.1 // 100ms between characters
  } = options;

  try {
    let audio_spelling = null;

    const uppercaseUsername = username.toUpperCase();
    for (let i = 0; i < uppercaseUsername.length; i++) {
      const char = uppercaseUsername[i];
      
      if (/[A-Z]/.test(char)) {
        // Letter
        const letter = char.toUpperCase();
        console.log(`Loading letter sound: ${lettersPath}/${letter}.wav`);
        
        try {
          const letterBuffer = await loadAudioFromUrl(`${lettersPath}/${letter}.wav`, audioContext);
          // Speed up the audio by 25% for better pacing (1.25x faster)
          const speedFactor = 1.25;
          const speedUpLetterBuffer = speedUpBuffer(letterBuffer, speedFactor, audioContext);
          audio_spelling = concatenateAudioBuffers(audio_spelling, speedUpLetterBuffer);
        } catch (error) {
          console.warn(`Failed to load letter sound for '${letter}':`, error);
        }
        
      } else if (/[0-9]/.test(char)) {
        // Number
        console.log(`Loading number sound: ${numbersPath}/${char}.wav`);
        
        try {
          const numberBuffer = await loadAudioFromUrl(`${numbersPath}/${char}.wav`, audioContext);
          // Speed up the audio by 25% for better pacing (1.25x faster)
          const speedFactor = 1.25;
          const speedUpNumberBuffer = speedUpBuffer(numberBuffer, speedFactor, audioContext);
          audio_spelling = concatenateAudioBuffers(audio_spelling, speedUpNumberBuffer);
        } catch (error) {
          console.warn(`Failed to load number sound for '${char}':`, error);
        }
        
      } else if (/[^a-zA-Z0-9]/.test(char)) {
        // Special character
        console.log(`Loading symbol sound: ${symbolsPath}/${char}.mp3`);
        
        try {
          const symbolBuffer = await loadAudioFromUrl(`${symbolsPath}/${char}.mp3`, audioContext);
          audio_spelling = concatenateAudioBuffers(audio_spelling, symbolBuffer);
        } catch (error) {
          console.warn(`No specific sound for symbol '${char}', trying generic symbol sound.`);
          
          try {
            const genericSymbolBuffer = await loadAudioFromUrl(`${symbolsPath}/symbol.mp3`, audioContext);
            audio_spelling = concatenateAudioBuffers(audio_spelling, genericSymbolBuffer);
          } catch (error2) {
            console.warn(`Failed to load generic symbol sound:`, error2);
          }
        }
      }

      // Add spacing between characters
      if (i < username.length - 1) {
        const silenceBuffer = createSilenceBuffer(audioContext, silenceDuration);
        audio_spelling = concatenateAudioBuffers(audio_spelling, silenceBuffer);
      }
    }

    return audio_spelling;
  } catch (error) {
    console.error('Error spelling out username:', error);
    throw error;
  }
}

/**
 * Generate watermark by spelling out username with intro/outro clips
 * @param {string} username - Username to spell out
 * @param {string} type - 'scrambler' or 'unscrambler'
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {object} options - Generation options
 * @returns {Promise<AudioBuffer>} Complete watermark audio buffer
 */
export async function generateSpelledWatermark(username, type = 'unscrambler', audioContext, options = {}) {
  const {
    watermarksPath = '/watermarks',
    silenceBetween = 0.2 // 200ms between intro/username/outro
  } = options;

  try {
    let watermarkBuffer = null;
    let introClip, outroClip;

    // Load intro and outro clips based on type
    if (type === 'scrambler') {
      introClip = `${watermarksPath}/scrambled-intro.mp3`;
      outroClip = `${watermarksPath}/on-scrambler-dot-com.mp3`;
    } else if (type === 'unscrambler') {
      introClip = `${watermarksPath}/unscrambled-intro.mp3`;
      outroClip = `${watermarksPath}/unscrambled-outro.mp3`;
    }

    // Load intro
    console.log(`Loading intro: ${introClip}`);
    const introBuffer = await loadAudioFromUrl(introClip, audioContext);
    watermarkBuffer = concatenateAudioBuffers(watermarkBuffer, introBuffer);

    // Add silence
    const silence1 = createSilenceBuffer(audioContext, silenceBetween);
    watermarkBuffer = concatenateAudioBuffers(watermarkBuffer, silence1);

    // Spell out username
    console.log(`Spelling username: ${username}`);
    const spelledUsername = await spellOutUsername(username, audioContext, options);
    watermarkBuffer = concatenateAudioBuffers(watermarkBuffer, spelledUsername);

    // Add silence
    const silence2 = createSilenceBuffer(audioContext, silenceBetween);
    watermarkBuffer = concatenateAudioBuffers(watermarkBuffer, silence2);

    // Load outro
    console.log(`Loading outro: ${outroClip}`);
    const outroBuffer = await loadAudioFromUrl(outroClip, audioContext);
    watermarkBuffer = concatenateAudioBuffers(watermarkBuffer, outroBuffer);

    console.log('Generated spelled watermark:', {
      duration: watermarkBuffer.duration,
      sampleRate: watermarkBuffer.sampleRate
    });

    return watermarkBuffer;
  } catch (error) {
    console.error('Error generating spelled watermark:', error);
    throw error;
  }
}

 


export default {
  generateWatermark,
  loadAudioFromUrl,
  prependWatermark,
  overlayWatermarkAtIntervals,
  checkTTSServerHealth,
  useGoogleTTS,
  generateWatermarkWithGoogleTTS,
  spellOutUsername,
  generateSpelledWatermark
};
