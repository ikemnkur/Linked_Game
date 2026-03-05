// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Box,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../api/client';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from navigation state if available
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  // const validateEmail = (email) => {
  //   // Standard email validation that allows dots in the local part (e.g., user.name@domain.com)
  //   const atIndex = email.indexOf('@');
    
  //   // Must have exactly one @, not at start or end
  //   if (atIndex === -1 || atIndex === 0 || email.endsWith('@')) return false;
    
  //   const localPart = email.substring(0, atIndex);
  //   const domain = email.substring(atIndex + 1);
    
  //   // Local part: not empty, doesn't start/end with dot
  //   if (!localPart || localPart.startsWith('.') || localPart.endsWith('.')) return false;
    
  //   // Domain: must have at least one dot, doesn't start/end with dot
  //   if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return false;
    
  //   return true;
  // };

  const validateEmail = (email) => {
    const atIndex = email.indexOf('@');
    return atIndex > 0 &&                          // '@' exists and isn't the first char
           email.lastIndexOf('.') > atIndex &&     // a dot exists somewhere after '@'
           !email.endsWith('.') &&                 // doesn't end with a dot
           !email.endsWith('@');                   // doesn't end with '@'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!email || !resetCode || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/auth/reset-password', {
        email,
        resetCode,
        newPassword
      });
      
      if (response.data.success) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to reset password.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mt: 8
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%', background: '#1f201aff' }} elevation={3}>
        <CardHeader
          title="Reset Password"
          subheader="Enter the code from your email and choose a new password"
          sx={{ textAlign: 'center', pb: 1 }}
          avatar={<LockResetIcon sx={{ fontSize: 40 }} />}
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Password reset successful! Redirecting to login...
            </Alert>
          )}

          {!success && (
            <form onSubmit={handleSubmit}>
              <TextField
                label="Email Address"
                variant="outlined"
                fullWidth
                margin="normal"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter your email"
              />

              <TextField
                label="Reset Code"
                variant="outlined"
                fullWidth
                margin="normal"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter 6-digit code from email"
                inputProps={{ 
                  maxLength: 6,
                  pattern: '[0-9]*',
                  inputMode: 'numeric'
                }}
              />

              <TextField
                label="New Password"
                variant="outlined"
                fullWidth
                margin="normal"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter new password (min. 6 characters)"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <TextField
                label="Confirm New Password"
                variant="outlined"
                fullWidth
                margin="normal"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Confirm your new password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowConfirmPassword}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Reset Password'}
              </Button>
            </form>
          )}

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/forgot-password" sx={{ mr: 2 }}>
              Request New Code
            </Link>
            <Link component={RouterLink} to="/login">
              Back to Login
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPassword;
