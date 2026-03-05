// src/components/Auth.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Box,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
  Stack
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Link as RouterLink } from 'react-router-dom';
import SimpleDotCaptcha from './SimpleDotCaptcha';
import DotCaptcha from './DotCaptcha';
import CoinAnimationCanvas from '../components/CoinAnimationCanvas';
import { useFingerprint } from '../contexts/FingerprintContext';
import api from '../api/client';


const Auth = ({ isLogin, onLoginSuccess }) => {
  // Get fingerprint context
  const { submitFingerprint, loading: fingerprintLoading } = useFingerprint();

  // State variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [birthday, setBirthday] = useState('');
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loginStep, setLoginStep] = useState(1); // 1: credentials, 2: CAPTCHA
  const [blockTime, setBlockTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [accountType, setAccountType] = useState('buyer'); // New state for account type

  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001';

  // Load user profile from server
  // const loadUserProfile = async () => {
  //   try {
  //     const userdata = localStorage.getItem('userdata');
  //     if (!userdata) {
  //       throw new Error('No user data found');
  //     }

  //     const userData = JSON.parse(userdata);

  //     // Fetch latest user data from JSON server
  //     const response = await api.get(`/api/userData/${userData.id}`);

  //     if (response.status !== 200) {
  //       throw new Error('Failed to fetch user profile');
  //     }

  //     const profile = response.data;
  //     const updatedUserData = {
  //       ...profile,
  //       birthDate: profile.birthDate ? profile.birthDate.split('T')[0] : '',
  //     };

  //     setUserData(updatedUserData);
  //     localStorage.setItem('userdata', JSON.stringify(updatedUserData));
  //   } catch (error) {
  //     console.error('Error fetching user profile:', error);
  //     // If error fetching profile, user might need to login again
  //     if (error.message.includes('No user data found')) {
  //       navigate('/login');
  //     }
  //   }
  // };

  // Function to check block status
  const checkBlockStatus = useCallback(() => {
    const blockData = localStorage.getItem('captchaBlock');
    if (blockData) {
      const { timestamp } = JSON.parse(blockData);
      const currentTime = Date.now();
      if (currentTime - timestamp < 30 * 60 * 1000) { // 0.5 hour
        setBlockTime(timestamp + 30 * 60 * 1000);
      } else {
        localStorage.removeItem('captchaBlock');
      }
    }
  }, []);

  // Function to handle unblocking
  const handleUnblock = useCallback(() => {
    setBlockTime(null);
    setRemainingTime(null);
    localStorage.removeItem('captchaBlock');
    localStorage.removeItem('failedCaptcha'); // Reset failed attempts
  }, []);

  // Check if user is blocked on mount
  useEffect(() => {
    checkBlockStatus();
  }, [checkBlockStatus]);

  // Set up a timer to unblock the user after blockTime and update remaining time
  useEffect(() => {
    if (blockTime) {
      const updateRemainingTime = () => {
        const remaining = Math.max(0, Math.ceil((blockTime - Date.now()) / 1000));
        setRemainingTime(remaining);
      };

      updateRemainingTime(); // Initial call to set the remaining time
      const timer = setInterval(() => {
        updateRemainingTime();
        const currentTime = Date.now();
        if (currentTime >= blockTime) {
          handleUnblock();
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [blockTime, handleUnblock]);

  // New useEffect to check if user is already logged in and validate the token
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userdata = localStorage.getItem('userdata');

    if (token && userdata) {
      try {
        const userData = JSON.parse(userdata);
        console.log('Valid token found for user:', userData.username);
        // Token exists, redirect to main page
        // Note: Token validation happens on the server via the authenticateToken middleware
        navigate('/');
      } catch (error) {
        // Error parsing user data, remove invalid data
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userdata');
        localStorage.removeItem('accountType');
      }
    }
  }, [navigate]);

  // Handler for successful CAPTCHA
  const handleCaptchaSuccess = useCallback(async () => {
    console.log('🎉 CAPTCHA completed successfully!');
    setCaptchaPassed(true);
    setCaptchaFailed(false);

    // Proceed to submit the authentication request after CAPTCHA is passed
    // try {
    console.log('🚀 Starting authentication process...');
    if (isLogin) {
      console.log('📝 Processing login for email:', email);

      // Use the authentication endpoint we set up in the server
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email, // Using email as username for login
          password: password
        })
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const loginData = await loginResponse.json();
      console.log('✅ Login response from server:', loginData);

      if (!loginData.user) {
        throw new Error(loginData.message || 'Login failed');
      }

      console.log('User data received from server:', loginData.user);


      // Store user data and token from server response
      let { user, token, accountType, tokenExpiry, verification } = loginData;
      localStorage.setItem('verification', JSON.stringify(verification));
      localStorage.setItem('token', token);
      localStorage.setItem('userdata', JSON.stringify(user));
      localStorage.setItem('tokenExpiry', tokenExpiry);
      localStorage.setItem('accountType', accountType);


      console.log('✅ Login successful for:', user.username);
      setLoginStep(2); // Move to CAPTCHA step after successful login

      // Clear failed CAPTCHA attempts on success
      localStorage.removeItem('failedCaptcha');

      // Submit device fingerprint to backend
      console.log('🔐 Submitting device fingerprint...');
      try {
        //  const fingerprintResult = await refreshFingerprint(user.id);
        const fingerprintResult = await submitFingerprint(user.id);
        // alert('Fingerprint Result: ' + JSON.stringify(fingerprintResult));
        localStorage.setItem('fingerprintData', JSON.stringify(fingerprintResult));
        if (fingerprintResult.success) {
          console.log('✅ Device fingerprint recorded');
        } else {
          console.warn('⚠️ Failed to record fingerprint:', fingerprintResult.message);
          // Don't block login if fingerprint fails
        }
      } catch (fpError) {
        console.error('⚠️ Error recording fingerprint:', fpError);
        // Don't block login if fingerprint fails
      }

    } else {

      // ###### Registration Flow ######

      console.log('📝 Processing registration for username:', username);

      // Use the registration endpoint we set up in the server
      const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
          firstName: name.split(' ')[0] || name,
          lastName: name.split(' ').slice(1).join(' ') || '',
          accountType: "free",
          birthDate: birthday
        })
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        setAuthError(errorData.message || 'Registration failed. Please try again.');
        setShowCaptcha(false);
        setCaptchaPassed(false);
        return;
      }

      const registerData = await registerResponse.json();
      console.log('✅ Registration response from server:', registerData);

      if (!registerData.success) {
        setAuthError(registerData.message || 'Registration failed. Please try again.');
        setShowCaptcha(false);
        setCaptchaPassed(false);
        return;
      }

      // Store user data and token from server response
      const { user, token } = registerData;
      localStorage.setItem('token', token);
      localStorage.setItem('tokenExpiry', user.tokenExpiry);
      localStorage.setItem('userdata', JSON.stringify(user));
      localStorage.setItem('accountType', user.accountType);
      localStorage.setItem('unlockedKeys', JSON.stringify([])); // Initialize unlocked keys storage

      console.log('✅ Registration successful for:', user.username);
      setLoginStep(2); // Move to CAPTCHA step after successful registration

      // Submit device fingerprint to backend after registration
      console.log('🔐 Submitting device fingerprint...');
      try {
        const fingerprintResult = await submitFingerprint(user.id);
        if (fingerprintResult.success) {
          console.log('✅ Device fingerprint recorded');
        } else {
          console.warn('⚠️ Failed to record fingerprint:', fingerprintResult.message);
        }
      } catch (fpError) {
        console.error('⚠️ Error recording fingerprint:', fpError);
      }
    }

    // Clear failed CAPTCHA attempts on success
    localStorage.removeItem('failedCaptcha');

    console.log('🎯 Calling onLoginSuccess callback...');
    if (onLoginSuccess) {
      onLoginSuccess();
    }

    // Safely parse verification data from localStorage
    let verification = null;
    const verificationData = localStorage.getItem('verification');

    if (verificationData && verificationData !== 'undefined' && verificationData !== 'null') {
      try {
        verification = JSON.parse(verificationData);
      } catch (error) {
        console.error('Failed to parse verification data:', error);
        verification = null;
      }
    }

    // Check if verification is valid and has required fields
    if (!verification || !verification.amount1 || !verification.amount2) {
      // Navigate to verify-account page
      console.log('navigating to /verify-account page...');
      setTimeout(() => {
        navigate(`/verify-account?email=${email}&username=${username}`);
      }, 500);
    } else {
      // Navigate to main page after successful verification
      console.log('🧭 Navigating to /dashboard page...');
      setTimeout(() => {
        navigate('/');
      }, 500);
    }


    // } catch (error) {
    //   console.error('Auth error:', error || 'An error occurred');
    //   alert(error.message || 'An error occurred during authentication.');
    //   // Reset CAPTCHA state to allow the user to try again
    //   setCaptchaPassed(false);
    //   setShowCaptcha(false);
    // }
  }, [email, password, username, name, birthday, accountType, isLogin, navigate, onLoginSuccess]);

  // Handler for failed CAPTCHA
  const handleCaptchaFailure = useCallback(() => {
    const failedAttempts = parseInt(localStorage.getItem('failedCaptcha') || '0', 10) + 1;
    localStorage.setItem('failedCaptcha', failedAttempts);
    if (failedAttempts >= 3) {
      localStorage.setItem('captchaBlock', JSON.stringify({ timestamp: Date.now() }));
      setBlockTime(Date.now() + 15 * 60 * 1000); // Block for 15 minutes
      setCaptchaFailed(true);
    }
  }, []);

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
  
  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // If CAPTCHA has not been shown yet
    if (!showCaptcha) {
      // Check if required fields are filled
      if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        return;
      }
      if (isLogin) {
        if (!email || !password) {
          alert('Please enter your email and password.');
          return;
        }
      } else {
        if (!username || !email || !password || !confirmPassword || !name || !country || !city || !birthday) {
          alert('Please fill in all required fields.');
          return;
        }
        if (password !== confirmPassword) {
          alert('Passwords do not match.');
          return;
        }
      }
      // Show CAPTCHA
      setShowCaptcha(true);
      return;
    }

    // If CAPTCHA is shown but not passed
    if (showCaptcha && !captchaPassed) {
      alert('Please complete the CAPTCHA correctly before submitting.');
      return;
    }
  };

  if (blockTime) {
    const remaining = remainingTime !== null
      ? remainingTime
      : Math.max(0, Math.ceil((blockTime - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 8
        }}
      >
        <Card sx={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: 2 }}>
          <CardContent>
            <Typography variant="h6" color="error">
              Too many failed attempts.
            </Typography>
            <Typography variant="body1">
              Please try again in {minutes} minute{minutes !== 1 ? 's' : ''} and {seconds} second{seconds !== 1 ? 's' : ''}.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mt: 2
      }}
    >


      {/* /* Add your coin animation just under the avatar, for example */}
      <Box sx={{ mb: 2 }}>
        <CoinAnimationCanvas />
      </Box>


      <Card sx={{ maxWidth: 400, width: '100%', background: '#1f201aff' }} elevation={0}>
        {/* <Avatar sx={{ m: 1, margin: "10px auto", textAlign: 'center', bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar> */}
        <CardHeader
          title={isLogin ? 'Login' : 'Sign Up'}
          sx={{ textAlign: 'center' }}
        />
        <CardContent>

          {authError && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: 'error.dark', borderRadius: 1 }}>
              <Typography variant="body2" color="white">
                ⚠️ {authError}
              </Typography>
            </Box>
          )}
          {loginStep === 1 && ( //enter credentials step
            
          <>
            <form onSubmit={handleSubmit}>
                {!isLogin && (
                  <div>


                    <TextField
                      label="Username"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      value={username}
                      onChange={(e) => {
                        if (e.target.value.length <= 24) {
                          setUsername(e.target.value);
                        }
                        if(e.target.value.includes(' ') || e.target.value.includes('@') || e.target.value.includes('.') || e.target.value.includes('/') ) {
                          alert('Username cannot contain spaces or special characters');
                        }
                      }}
                      required
                      inputProps={{ maxLength: 24 }}
                      helperText={username.length === 24 ? "Maximum 24 characters allowed" : ""}
                    />
                  </div>
                )}
                {!isLogin && (
                  <TextField
                    label="Name"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                )}
                {!isLogin && (
                  <TextField
                    label="Country"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                  />
                )}
                {!isLogin && (
                  <TextField
                    label="City"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                )}
                {!isLogin && (
                  <TextField
                    label="Birthday"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    required
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                )}
                <TextField
                  label="Email"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <TextField
                  label="Password"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {!isLogin && (
                  <TextField
                    label="Confirm Password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                )}
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => setAccountType('buyer')}
                >
                  {isLogin ? 'Login' : 'Sign Up'}
                </Button>
              </form>
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                {isLogin ? (
                  <> <Link component={RouterLink} to="/register">
                    Don't have an account? Sign Up
                  </Link>
                    <Link component={RouterLink} to="/forgot-password" sx={{ display: 'block', mt: 1 }}>
                      Forgot your password?
                    </Link>
                  </>
                ) : (
                  <Link component={RouterLink} to="/login">
                    Already have an account? Login
                  </Link>
                )}
              </Box>
            </>
            // <Box sx={{ mb: 2 }}>
            //   <CaptchaComponent onVerify={() => setCaptchaPassed(true)} />
            // </Box>
          )}
          {/* Show CAPTCHA below the form after submit is clicked */}
          {showCaptcha && !captchaPassed && (

            <>
              <Stack direction="row" spacing={2} alignItems="center" margin="auto" sx={{ justifyContent: 'center' }}>
                {/* <Typography variant="body2">Desktop Mode</Typography> */}
                <Button
                  variant={isMobile ? "outlined" : "contained"}
                  size="small"
                  onClick={() => setIsMobile(false)}
                >
                  PC
                </Button>
                <Button
                  variant={isMobile ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setIsMobile(true)}
                >
                  Mobile
                </Button>
              </Stack>

              <Box sx={{ mt: 2 }}>

                {isMobile ? (
                  <DotCaptcha
                    onSuccess={handleCaptchaSuccess}
                    onFail={handleCaptchaFailure}
                  />
                ) : (

                  <SimpleDotCaptcha
                    onPass={handleCaptchaSuccess}
                    onFail={handleCaptchaFailure}
                  />
                )}
              </Box>
            </>


          )}
          {captchaFailed && (
            <Typography variant="body2" color="error" align="center" sx={{ mt: 2 }}>
              You have been blocked due to multiple failed CAPTCHA attempts. Please try again later.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>


  );
};

export default Auth;
