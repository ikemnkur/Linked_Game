/**
 * DeviceHistory.jsx - Display user's login device history
 * 
 * Shows all devices that have logged into a user's account
 * Useful for security monitoring and leak prevention
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Computer as ComputerIcon,
  PhoneAndroid as PhoneIcon,
  Tablet as TabletIcon,
  Public as PublicIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useFingerprint } from '../contexts/FingerprintContext';
import { useToast } from '../contexts/ToastContext';

const DeviceHistory = ({ userId, showCurrentDevice = true }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const { getUserDevices, fingerprint } = useFingerprint();
  const { showToast } = useToast();

  useEffect(() => {
    if (userId) {
      loadDevices();
    }
  }, [userId]);

  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getUserDevices(userId);
      
      if (result.success) {
        setDevices(result.devices || []);
      } else {
        setError(result.message || 'Failed to load devices');
      }
    } catch (err) {
      setError('Error loading device history');
      console.error('Load devices error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDevices();
    showToast('Refreshing device list...', 'info');
  };

  const handleViewDetails = (device) => {
    setSelectedDevice(device);
    setDetailsDialogOpen(true);
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <PhoneIcon />;
      case 'tablet':
        return <TabletIcon />;
      case 'desktop':
      default:
        return <ComputerIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'recent':
        return 'info';
      case 'inactive':
        return 'warning';
      case 'dormant':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const isCurrentDevice = (device) => {
    return fingerprint && device.fingerprint_hash === fingerprint.hash;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
        <Button onClick={loadDevices} size="small" sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon /> Device Login History
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          variant="outlined"
          size="small"
        >
          Refresh
        </Button>
      </Box>

      {devices.length === 0 ? (
        <Alert severity="info">
          No device history found. Devices will appear here after you log in.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {devices.map((device) => (
            <Grid item xs={12} md={6} key={device.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  border: isCurrentDevice(device) ? '2px solid #4caf50' : 'none',
                  position: 'relative'
                }}
              >
                {isCurrentDevice(device) && showCurrentDevice && (
                  <Chip
                    label="Current Device"
                    color="success"
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  />
                )}
                
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ 
                      bgcolor: 'background.paper', 
                      p: 1.5, 
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {getDeviceIcon(device.device_type)}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">
                        {device.device_type || 'Unknown Device'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {device.browser || 'Unknown Browser'}
                      </Typography>
                    </Box>
                    {device.is_blocked && (
                      <Tooltip title={device.block_reason || 'Device blocked'}>
                        <BlockIcon color="error" />
                      </Tooltip>
                    )}
                  </Box>

                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Operating System
                      </Typography>
                      <Typography variant="body2">
                        {device.os || 'Unknown'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Screen Resolution
                      </Typography>
                      <Typography variant="body2">
                        {device.screen_resolution || 'Unknown'}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Language
                      </Typography>
                      <Typography variant="body2">
                        {device.language || 'Unknown'}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Timezone
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        {device.timezone || 'Unknown'}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        IP Address
                      </Typography>
                      <Typography variant="body2">
                        {device.ip_address || 'Unknown'}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={`Status: ${device.device_status || 'unknown'}`}
                      color={getStatusColor(device.device_status)}
                      size="small"
                    />
                    <Chip
                      icon={<ScheduleIcon />}
                      label={`${device.login_count || 0} logins`}
                      size="small"
                      variant="outlined"
                    />
                    {device.unscramble_count > 0 && (
                      <Chip
                        label={`${device.unscramble_count} unscrambles`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    )}
                    {device.leaked_content_count > 0 && (
                      <Chip
                        icon={<WarningIcon />}
                        label={`${device.leaked_content_count} leaks`}
                        size="small"
                        color="error"
                      />
                    )}
                    {device.is_trusted && !device.is_blocked && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Trusted"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2">
                        Timeline & Details
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell><strong>First Seen</strong></TableCell>
                            <TableCell>{formatDate(device.first_seen)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell><strong>Last Seen</strong></TableCell>
                            <TableCell>{formatDate(device.last_seen)}</TableCell>
                          </TableRow>
                          {device.last_unscramble && (
                            <TableRow>
                              <TableCell><strong>Last Unscramble</strong></TableCell>
                              <TableCell>{formatDate(device.last_unscramble)}</TableCell>
                            </TableRow>
                          )}
                          <TableRow>
                            <TableCell><strong>Device Hash</strong></TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                {device.short_hash || device.fingerprint_hash?.substring(0, 16)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      
                      <Button
                        startIcon={<InfoIcon />}
                        onClick={() => handleViewDetails(device)}
                        size="small"
                        sx={{ mt: 1 }}
                        fullWidth
                        variant="outlined"
                      >
                        View Full Details
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Device Fingerprint Details
        </DialogTitle>
        <DialogContent>
          {selectedDevice && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Device Information
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Device Type</strong></TableCell>
                      <TableCell>{selectedDevice.device_type}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Browser</strong></TableCell>
                      <TableCell>{selectedDevice.browser}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Operating System</strong></TableCell>
                      <TableCell>{selectedDevice.os}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Screen Resolution</strong></TableCell>
                      <TableCell>{selectedDevice.screen_resolution}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Timezone</strong></TableCell>
                      <TableCell>{selectedDevice.timezone}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Language</strong></TableCell>
                      <TableCell>{selectedDevice.language}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>IP Address</strong></TableCell>
                      <TableCell>{selectedDevice.ip_address}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="subtitle2" gutterBottom>
                Activity Statistics
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>Login Count</strong></TableCell>
                      <TableCell>{selectedDevice.login_count}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Unscramble Count</strong></TableCell>
                      <TableCell>{selectedDevice.unscramble_count}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Leaked Content</strong></TableCell>
                      <TableCell>{selectedDevice.leaked_content_count}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>First Seen</strong></TableCell>
                      <TableCell>{formatDate(selectedDevice.first_seen)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>Last Seen</strong></TableCell>
                      <TableCell>{formatDate(selectedDevice.last_seen)}</TableCell>
                    </TableRow>
                    {selectedDevice.last_unscramble && (
                      <TableRow>
                        <TableCell><strong>Last Unscramble</strong></TableCell>
                        <TableCell>{formatDate(selectedDevice.last_unscramble)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="subtitle2" gutterBottom>
                Fingerprint Hashes
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="caption" display="block" gutterBottom>
                  <strong>Short Hash:</strong>
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mb: 2 }}
                >
                  {selectedDevice.short_hash}
                </Typography>
                
                <Typography variant="caption" display="block" gutterBottom>
                  <strong>Full Hash:</strong>
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {selectedDevice.fingerprint_hash}
                </Typography>
              </Paper>

              {selectedDevice.is_blocked && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <strong>Device Blocked</strong><br />
                  Reason: {selectedDevice.block_reason || 'No reason provided'}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceHistory;
