import React, { useState, useRef } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  VolumeUp,
  Refresh
} from '@mui/icons-material';
import { useGoogleTTS, generateWatermarkWithGoogleTTS } from '../utils/ttsWatermarkService';

export default function TestGoogleTTS() {
  const [text, setText] = useState('Hello, this is a test of Google Text to Speech.');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [audioInfo, setAudioInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef(null);
  const audioBufferRef = useRef(null);
  const sourceNodeRef = useRef(null);

  // Watermark test
  const [username, setUsername] = useState('testuser123');
  const [watermarkType, setWatermarkType] = useState('scrambler');

  // Initialize AudioContext
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // Generate TTS
  const handleGenerateTTS = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setAudioInfo(null);

    try {
      const audioContext = getAudioContext();
      const audioBuffer = await useGoogleTTS(text, audioContext, { language });
      
      audioBufferRef.current = audioBuffer;
      
      setAudioInfo({
        duration: audioBuffer.duration.toFixed(2),
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });
      
      setSuccess('Audio generated successfully! Click Play to hear it.');
    } catch (err) {
      setError(`Failed to generate TTS: ${err.message}`);
      console.error('TTS Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate Watermark
  const handleGenerateWatermark = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setAudioInfo(null);

    try {
      const audioContext = getAudioContext();
      const audioBuffer = await generateWatermarkWithGoogleTTS(username, watermarkType, audioContext);
      
      audioBufferRef.current = audioBuffer;
      
      setAudioInfo({
        duration: audioBuffer.duration.toFixed(2),
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });
      
      setSuccess('Watermark generated successfully! Click Play to hear it.');
    } catch (err) {
      setError(`Failed to generate watermark: ${err.message}`);
      console.error('Watermark Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Play audio
  const handlePlay = () => {
    if (!audioBufferRef.current) {
      setError('No audio to play. Generate TTS first.');
      return;
    }

    // Stop any currently playing audio
    handleStop();

    try {
      const audioContext = getAudioContext();
      const source = audioContext.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        setIsPlaying(false);
      };
      
      source.start(0);
      sourceNodeRef.current = source;
      setIsPlaying(true);
      setSuccess('Playing audio...');
    } catch (err) {
      setError(`Failed to play audio: ${err.message}`);
    }
  };

  // Stop audio
  const handleStop = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      } catch (err) {
        // Ignore if already stopped
      }
    }
    setIsPlaying(false);
  };

  // Download audio
  const handleDownload = () => {
    if (!audioBufferRef.current) {
      setError('No audio to download. Generate TTS first.');
      return;
    }

    try {
      // Convert AudioBuffer to WAV
      const audioContext = getAudioContext();
      const wav = audioBufferToWav(audioBufferRef.current);
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `google-tts-${Date.now()}.wav`;
      a.click();
      
      URL.revokeObjectURL(url);
      setSuccess('Audio downloaded successfully!');
    } catch (err) {
      setError(`Failed to download: ${err.message}`);
    }
  };

  // Convert AudioBuffer to WAV
  const audioBufferToWav = (buffer) => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // avg. bytes/sec
    setUint16(buffer.numberOfChannels * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ color: '#00e676', fontWeight: 'bold' }}>
        <VolumeUp sx={{ fontSize: 40, mr: 1, verticalAlign: 'middle' }} />
        Google TTS Test Page
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 4, color: '#e0e0e0' }}>
        Test the Google Text-to-Speech functionality with custom text and languages.
      </Typography>

      {/* Simple TTS Test */}
      <Card sx={{ mb: 3, backgroundColor: '#1a1a1a', color: '#ffffff' }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2, color: '#00e676' }}>
            Simple TTS Test
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Text to Speak"
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{ 
              mb: 2,
              '& .MuiInputLabel-root': { color: '#e0e0e0' },
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                '& fieldset': { borderColor: '#555555' },
                '&:hover fieldset': { borderColor: '#00e676' },
                '&.Mui-focused fieldset': { borderColor: '#00e676' },
              }
            }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#e0e0e0' }}>Language</InputLabel>
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              label="Language"
              sx={{
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555555' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00e676' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00e676' },
              }}
            >
              {languages.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={handleGenerateTTS}
              disabled={loading || !text}
              sx={{ 
                backgroundColor: '#00e676',
                color: '#000000',
                '&:hover': { backgroundColor: '#00c853' }
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Generate TTS'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Watermark Test */}
      <Card sx={{ mb: 3, backgroundColor: '#1a1a1a', color: '#ffffff' }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2, color: '#00e676' }}>
            Watermark Test
          </Typography>
          
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ 
              mb: 2,
              '& .MuiInputLabel-root': { color: '#e0e0e0' },
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                '& fieldset': { borderColor: '#555555' },
                '&:hover fieldset': { borderColor: '#00e676' },
                '&.Mui-focused fieldset': { borderColor: '#00e676' },
              }
            }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#e0e0e0' }}>Type</InputLabel>
            <Select
              value={watermarkType}
              onChange={(e) => setWatermarkType(e.target.value)}
              label="Type"
              sx={{
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555555' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00e676' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00e676' },
              }}
            >
              <MenuItem value="scrambler">Scrambler</MenuItem>
              <MenuItem value="unscrambler">Unscrambler</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={handleGenerateWatermark}
            disabled={loading || !username}
            sx={{ 
              backgroundColor: '#00e676',
              color: '#000000',
              '&:hover': { backgroundColor: '#00c853' }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Generate Watermark'}
          </Button>
        </CardContent>
      </Card>

      {/* Audio Controls */}
      {audioBufferRef.current && (
        <Card sx={{ mb: 3, backgroundColor: '#1a1a1a', color: '#ffffff' }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2, color: '#00e676' }}>
              Audio Controls
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handlePlay}
                disabled={isPlaying}
                sx={{ 
                  backgroundColor: '#00e676',
                  color: '#000000',
                  '&:hover': { backgroundColor: '#00c853' }
                }}
              >
                Play
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Stop />}
                onClick={handleStop}
                disabled={!isPlaying}
                sx={{ 
                  borderColor: '#555555',
                  color: '#ffffff',
                  '&:hover': { borderColor: '#00e676' }
                }}
              >
                Stop
              </Button>

              <Button
                variant="outlined"
                onClick={handleDownload}
                sx={{ 
                  borderColor: '#555555',
                  color: '#ffffff',
                  '&:hover': { borderColor: '#00e676' }
                }}
              >
                Download WAV
              </Button>

              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => {
                  audioBufferRef.current = null;
                  setAudioInfo(null);
                  setSuccess('');
                  handleStop();
                }}
                sx={{ 
                  borderColor: '#555555',
                  color: '#ffffff',
                  '&:hover': { borderColor: '#00e676' }
                }}
              >
                Clear
              </Button>
            </Box>

            {audioInfo && (
              <>
                <Divider sx={{ my: 2, borderColor: '#555555' }} />
                <Paper sx={{ p: 2, backgroundColor: '#2a2a2a' }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>Audio Information:</Typography>
                  <Typography>Duration: {audioInfo.duration} seconds</Typography>
                  <Typography>Sample Rate: {audioInfo.sampleRate} Hz</Typography>
                  <Typography>Channels: {audioInfo.channels}</Typography>
                  <Typography>Length: {audioInfo.length} samples</Typography>
                </Paper>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
    </Container>
  );
}
