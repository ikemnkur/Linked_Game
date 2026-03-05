// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Link
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LockResetIcon from '@mui/icons-material/LockReset';
import api from '../api/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

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

    // Validate email
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      
      if (response.data.success) {
        console.log('Forgot password response:', response.data);
        setSuccess(true);
        // After showing success message, redirect to reset password page
        setTimeout(() => {
          navigate('/reset-password', { state: { email } });
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to send reset code.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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
          title="Forgot Password"
          subheader="Enter your email to receive a password reset code"
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
              Password reset code sent! Check your email and you'll be redirected to enter it shortly.
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
                placeholder="Enter your registered email"
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Send Reset Code'}
              </Button>
            </form>
          )}

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/login" sx={{ mr: 2 }}>
              Back to Login
            </Link>
            <Link component={RouterLink} to="/reset-password">
              Already have a code?
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPassword;
