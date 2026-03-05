import { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  LinearProgress,
  Stack,
  Chip,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Download,
  VoiceChat,
  Refresh
} from '@mui/icons-material';
import { 
  spellOutUsername, 
  generateSpelledWatermark,
  loadAudioFromUrl 
} from '../utils/ttsWatermarkService';

/**
 * Test page for spell-out-username TTS function
 * Allows users to test watermark generation with custom usernames
 */
export default function TestSpellOutUsername() {
  const [username, setUsername] = useState('');
  const [watermarkType, setWatermarkType] = useState('unscrambler');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);

  // Initialize audio context
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Convert AudioBuffer to WAV blob
  const audioBufferToWav = (audioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * numberOfChannels * 2;

    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  // Generate watermark
  const generateWatermark = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError('');
    setAudioBuffer(null);
    setDownloadUrl(null);
    stopPlayback();

    try {
      const audioContext = getAudioContext();
      setProgress(20);

      // Generate spelled watermark with intro/outro
      console.log(`Generating watermark for username: ${username}, type: ${watermarkType}`);
      
      const watermark = await generateSpelledWatermark(
        username,
        watermarkType,
        audioContext,
        {
          lettersPath: '/audio-alphabet',
          numbersPath: '/audio-numbers',
          symbolsPath: '/audio-symbols',
          watermarksPath: '/watermarks',
          silenceBetween: 0.2
        }
      );

      setProgress(80);

      // Create download URL
      const wavBlob = audioBufferToWav(watermark);
      const url = URL.createObjectURL(wavBlob);
      setDownloadUrl(url);

      setProgress(100);
      setAudioBuffer(watermark);

      console.log('Watermark generated successfully:', {
        duration: watermark.duration,
        sampleRate: watermark.sampleRate,
        channels: watermark.numberOfChannels
      });

    } catch (err) {
      console.error('Error generating watermark:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Play watermark
  const playWatermark = () => {
    if (!audioBuffer) return;

    stopPlayback();

    const audioContext = getAudioContext();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
      setIsPlaying(false);
      sourceNodeRef.current = null;
    };

    source.start(0);
    sourceNodeRef.current = source;
    setIsPlaying(true);
  };

  // Stop playback
  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (err) {
        // Already stopped
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  // Download watermark
  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `watermark_${watermarkType}_${username}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Handle watermark type change
  const handleTypeChange = (event, newType) => {
    if (newType !== null) {
      setWatermarkType(newType);
      // Clear existing audio when changing type
      setAudioBuffer(null);
      setDownloadUrl(null);
      stopPlayback();
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Box sx={{ textAlign: 'center' }}>
            <VoiceChat sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Test Spell-Out Username TTS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate audio watermarks with spelled-out usernames
            </Typography>
          </Box>

          <Divider />

          {/* Username Input */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Enter Username
            </Typography>
            <TextField
              fullWidth
              label="Username"
              placeholder="e.g., user123, JohnDoe, test_user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={processing}
              variant="outlined"
              helperText="Can include letters, numbers, and special characters"
            />
          </Box>

          {/* Watermark Type Selection */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Watermark Type
            </Typography>
            <ToggleButtonGroup
              value={watermarkType}
              exclusive
              onChange={handleTypeChange}
              fullWidth
              disabled={processing}
            >
              <ToggleButton value="scrambler">
                Scrambler
              </ToggleButton>
              <ToggleButton value="unscrambler">
                Unscrambler
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {watermarkType === 'scrambler' 
                ? 'Intro: "Protected audio by" + username + "on scrambler dot com"'
                : 'Intro: "Unscrambled by user" + username + "on scrambler dot com"'
              }
            </Typography>
          </Box>

          {/* Generate Button */}
          <Button
            variant="contained"
            size="large"
            startIcon={<VoiceChat />}
            onClick={generateWatermark}
            disabled={!username.trim() || processing}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {processing ? 'Generating...' : 'Generate Watermark'}
          </Button>

          {/* Progress */}
          {processing && (
            <Box>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Progress: {progress}%
              </Typography>
            </Box>
          )}

          {/* Error */}
          {error && <Alert severity="error">{error}</Alert>}

          {/* Audio Controls */}
          {audioBuffer && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Watermark Generated
                </Typography>
                
                <Stack spacing={2}>
                  {/* Audio Info */}
                  <Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip 
                        label={`Duration: ${audioBuffer.duration.toFixed(2)}s`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip 
                        label={`Sample Rate: ${audioBuffer.sampleRate} Hz`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip 
                        label={`Channels: ${audioBuffer.numberOfChannels}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip 
                        label={`Type: ${watermarkType}`}
                        size="small"
                        color="secondary"
                      />
                    </Stack>
                  </Box>

                  <Divider />

                  {/* Playback Controls */}
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      color={isPlaying ? 'error' : 'success'}
                      startIcon={isPlaying ? <Stop /> : <PlayArrow />}
                      onClick={isPlaying ? stopPlayback : playWatermark}
                      fullWidth
                    >
                      {isPlaying ? 'Stop' : 'Play'}
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Download />}
                      onClick={handleDownload}
                      fullWidth
                    >
                      Download
                    </Button>
                  </Stack>

                  {/* Success Message */}
                  <Alert severity="success">
                    Watermark ready! The username "{username}" has been spelled out character by character.
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card variant="outlined" sx={{ bgcolor: 'info.dark', color: 'white' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                How It Works:
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li>Each letter uses audio from <code>/audio-alphabet/</code></li>
                  <li>Each number uses audio from <code>/audio-numbers/</code></li>
                  <li>Each symbol uses audio from <code>/audio-symbols/</code></li>
                  <li>Intro/outro clips from <code>/watermarks/</code></li>
                  <li>200ms silence between sections</li>
                  <li>100ms silence between characters</li>
                </ul>
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Paper>
    </Box>
  );
}
