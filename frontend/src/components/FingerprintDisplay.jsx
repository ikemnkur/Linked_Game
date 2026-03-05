/**
 * FingerprintDisplay.jsx - Component to display device fingerprint information
 * 
 * Shows device fingerprint details to users and admins for transparency and debugging
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Grid
} from '@mui/material';
import {
  ExpandMore,
  ContentCopy,
  Refresh,
  Fingerprint,
  Security,
  Info
} from '@mui/icons-material';
import { useFingerprint } from '../contexts/FingerprintContext';
import { useToast } from '../contexts/ToastContext';

export default function FingerprintDisplay({ compact = false, showDetails = true }) {
  const { fingerprint, compactFingerprint, loading, error, getEmbeddableFingerprint, refreshFingerprint } = useFingerprint();
  const { success, error: showError } = useToast();
  const [expanded, setExpanded] = useState(false);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      success(`${label} copied to clipboard!`);
    } catch (e) {
      showError('Failed to copy to clipboard');
    }
  };

  const copyEmbeddable = () => {
    const encoded = getEmbeddableFingerprint();
    if (encoded) {
      copyToClipboard(encoded, 'Embeddable fingerprint');
    }
  };

  const copyHash = () => {
    if (fingerprint?.hash) {
      copyToClipboard(fingerprint.hash, 'Device hash');
    }
  };

  if (loading) {
    return (
      <Card sx={{ backgroundColor: '#424242', color: 'white' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} />
          <Typography>Generating device fingerprint...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error generating fingerprint: {error}
      </Alert>
    );
  }

  if (!fingerprint) {
    return null;
  }

  // Compact view - just the essentials
  if (compact) {
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip
          icon={<Fingerprint />}
          label={`Device: ${fingerprint.shortHash}`}
          size="small"
          color="primary"
        />
        <Chip
          label={`${fingerprint.browser.name} ${fingerprint.browser.version}`}
          size="small"
        />
        <Chip
          label={fingerprint.device.type}
          size="small"
        />
        <Tooltip title="Copy device hash">
          <IconButton size="small" onClick={copyHash}>
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  // Full view with details
  return (
    <Card elevation={3} sx={{ backgroundColor: '#424242', color: 'white' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security color="primary" />
            Device Fingerprint
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh fingerprint">
              <IconButton onClick={refreshFingerprint} sx={{ color: 'white' }}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy embeddable fingerprint">
              <Button
                size="small"
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={copyEmbeddable}
                sx={{ borderColor: '#666', color: '#e0e0e0' }}
              >
                Copy
              </Button>
            </Tooltip>
          </Box>
        </Box>

        <Alert severity="info" icon={<Info />} sx={{ mb: 2, backgroundColor: '#1976d2', color: 'white' }}>
          This unique device signature will be embedded in unscrambled content to track potential leaks.
        </Alert>

        {/* Summary Information */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="#bdbdbd">Device Hash</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {fingerprint.shortHash}
              <Tooltip title="Copy hash">
                <IconButton size="small" onClick={copyHash} sx={{ ml: 1, color: '#22d3ee' }}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="#bdbdbd">Timestamp</Typography>
            <Typography variant="body1">
              {new Date(fingerprint.timestamp).toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="#bdbdbd">Browser</Typography>
            <Typography variant="body1">
              {fingerprint.browser.name} {fingerprint.browser.version}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="#bdbdbd">Device Type</Typography>
            <Typography variant="body1">
              {fingerprint.device.type}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="#bdbdbd">Platform</Typography>
            <Typography variant="body1">
              {fingerprint.browser.platform}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="#bdbdbd">Screen Resolution</Typography>
            <Typography variant="body1">
              {fingerprint.screen.width}×{fingerprint.screen.height}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="#bdbdbd">Timezone</Typography>
            <Typography variant="body1">
              {fingerprint.timezone.timezone}
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="#bdbdbd">Language</Typography>
            <Typography variant="body1">
              {fingerprint.language.language}
            </Typography>
          </Grid>
        </Grid>

        {/* Compact Fingerprint for Embedding */}
        {compactFingerprint && (
          <Box sx={{ mb: 2, p: 2, backgroundColor: '#353535', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="#bdbdbd" sx={{ mb: 1 }}>
              Compact Fingerprint (for embedding)
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.85rem' }}>
              User: {compactFingerprint.username} ({compactFingerprint.userId})<br />
              Device: {compactFingerprint.device} | {compactFingerprint.browser}<br />
              Screen: {compactFingerprint.screen} | TZ: {compactFingerprint.timezone}<br />
              Hash: {compactFingerprint.hash}
            </Typography>
          </Box>
        )}

        {/* Detailed Information - Expandable */}
        {showDetails && (
          <>
            <Accordion
              expanded={expanded}
              onChange={() => setExpanded(!expanded)}
              sx={{ backgroundColor: '#353535', color: 'white', mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
                <Typography>Hardware Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  CPU Cores: {fingerprint.hardware.cores}<br />
                  Device Memory: {fingerprint.hardware.memory} GB<br />
                  Max Touch Points: {fingerprint.hardware.maxTouchPoints}<br />
                  GPU: {fingerprint.hardware.gpu?.renderer || 'Unknown'}
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ backgroundColor: '#353535', color: 'white', mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
                <Typography>Browser Features</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {Object.entries(fingerprint.features).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={key}
                      size="small"
                      color={value ? 'success' : 'default'}
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ backgroundColor: '#353535', color: 'white', mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
                <Typography>Installed Fonts ({fingerprint.fonts.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  {fingerprint.fonts.join(', ')}
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ backgroundColor: '#353535', color: 'white' }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'white' }} />}>
                <Typography>Full Hash</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                  {fingerprint.hash}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </CardContent>
    </Card>
  );
}
