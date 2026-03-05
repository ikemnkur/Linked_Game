import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Paper,
  Box,
  TextField,
  Avatar,
  Grid,
  Snackbar,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
// import FingerprintDisplay from '../components/FingerprintDisplay';


const AccountPage = () => {
  const [userData, setUserData] = useState({
    id: '',
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    bio: '',
    credits: 0,
    accountType: '',
    profilePicture: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001';

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const storedUserData = JSON.parse(localStorage.getItem("userdata") || '{}');
        const username = storedUserData.username || 'user_123';

        const response = await fetch(`${API_URL}/api/userData`);
        if (!response.ok) throw new Error('Failed to fetch');

        const allUsers = await response.json();
        const currentUser = allUsers.find(user => user.username === username);

        if (currentUser) {
          setUserData({
            id: currentUser.id,
            username: currentUser.username,
            email: currentUser.email,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            phoneNumber: currentUser.phoneNumber,
            bio: currentUser.bio || '',
            credits: currentUser.credits || 0,
            accountType: currentUser.accountType || 'buyer',
            profilePicture: currentUser.profilePicture || '',
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  if (isLoading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        backgroundColor: '#1a1a1a'
      }}>
        <CircularProgress sx={{ color: '#ffd700' }} />
      </Box>
    );
  }

  // Handle profile picture upload
  const handleProfilePicChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size (max 2MB)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setSnackbarMessage('Error: Images Only!');
      setOpenSnackbar(true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSnackbarMessage('Error: Max file size is 2MB');
      setOpenSnackbar(true);
      return;
    }

    // Reduce image resolution to max 512*512 while maintaining aspect ratio
    const img = document.createElement('img');
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDimension = 512;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          if (blob) {
            await uploadProfilePicture(new File([blob], file.name, { type: file.type }));
          } else {
            setSnackbarMessage('Error processing image');
            setOpenSnackbar(true);
          }
        }, file.type, 0.8); // Added quality parameter for better compression
      };
    };

    // Read the file only once
    reader.readAsDataURL(file);
  };


  // Upload profile picture to server
  const uploadProfilePicture = async (file) => {

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      // Upload using the api client  
      const response = await api.post(
        `${API_URL}/api/profile-picture/${userData.username}`,
        formData
      );

      console.log("Upload response:", response);

      // const response = await api.post(
      //   `${API_URL}/api/profile-picture/${userData.username}`,
      //   {
      //     method: 'POST',
      //     body: formData,
      //   }
      // );

      const result = await response.data;
      if (response.status === 200 && result.url) {
        setUserData((prev) => ({
          ...prev,
          profilePicture: result.url,
        }));
        setSnackbarMessage('Profile picture updated!');
        console.log(result.url);
      } else {
        setSnackbarMessage(result.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setSnackbarMessage('Upload failed');
    } finally {
      setOpenSnackbar(true);
      setUploading(false);
    }
  };

  // Handle input field changes
  const handleInputChange = (field) => (event) => {
    setUserData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/userData/${userData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          bio: userData.bio,
          phoneNumber: userData.phoneNumber
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        // Update localStorage
        localStorage.setItem('userdata', JSON.stringify(updatedUser));
        setSnackbarMessage('Profile updated successfully!');
      } else {
        setSnackbarMessage('Error: Failed to update profile');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSnackbarMessage('Error: Could not save changes');
    } finally {
      setSaving(false);
      setOpenSnackbar(true);
    }
  };

  return (
    <Box sx={{
      maxWidth: 1200,
      mx: 'auto',
      p: 2,
      backgroundColor: '#1a1a1a',
      minHeight: '100vh',
      color: '#fff'
    }}>
      <Typography
        variant="h3"
        component="h1"
        sx={{
          mb: 4,
          textAlign: 'center',
          fontWeight: 700,
          color: '#ffd700'
        }}
      >
        Account Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{
            p: 3,
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            <Typography
              variant="h6"
              sx={{
                mb: 3,
                fontWeight: 700,
                color: '#ffd700'
              }}
            >
              Profile Information
            </Typography>

            {/* only show avatar for sellers */}
            {JSON.parse(localStorage.getItem('userdata') || '{}').accountType === "seller" && (
              <>
                <Avatar
                  src={userData.profilePicture || '/default-avatar.png'}
                  sx={{
                    width: 100,
                    height: 100,
                    mx: 'auto',
                    mb: 3,
                    border: '3px solid #ffd700'
                  }}
                />
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Button
                    variant="contained"
                    component="label"
                    sx={{ backgroundColor: '#444', '&:hover': { backgroundColor: '#555' } }}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <CircularProgress size={24} sx={{ color: '#ffd700' }} />
                    ) : (
                      'Change Profile Picture'
                    )}
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleProfilePicChange}
                    />
                  </Button>
                </Box>
              </>
            )}

            <TextField
              fullWidth
              label="First Name"
              value={userData.firstName}
              onChange={handleInputChange('firstName')}
              margin="normal"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  '& fieldset': { borderColor: '#555' },
                  '&:hover fieldset': { borderColor: '#ffd700' },
                  '&.Mui-focused fieldset': { borderColor: '#ffd700' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' }
              }}
            />

            <TextField
              fullWidth
              label="Last Name"
              value={userData.lastName}
              onChange={handleInputChange('lastName')}
              margin="normal"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  '& fieldset': { borderColor: '#555' },
                  '&:hover fieldset': { borderColor: '#ffd700' },
                  '&.Mui-focused fieldset': { borderColor: '#ffd700' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' }
              }}
            />

            {/* <TextField
              fullWidth
              label="Email"
              value={userData.email}
              onChange={handleInputChange('email')}
              margin="normal"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  '& fieldset': { borderColor: '#555' },
                  '&:hover fieldset': { borderColor: '#ffd700' },
                  '&.Mui-focused fieldset': { borderColor: '#ffd700' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' }
              }}
            /> */}

            <TextField
              fullWidth
              label="Phone Number"
              value={userData.phoneNumber}
              onChange={handleInputChange('phoneNumber')}
              margin="normal"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  '& fieldset': { borderColor: '#555' },
                  '&:hover fieldset': { borderColor: '#ffd700' },
                  '&.Mui-focused fieldset': { borderColor: '#ffd700' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' }
              }}
            />

            <TextField
              fullWidth
              label="Bio"
              value={userData.bio}
              onChange={handleInputChange('bio')}
              multiline
              rows={3}
              margin="normal"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  '& fieldset': { borderColor: '#555' },
                  '&:hover fieldset': { borderColor: '#ffd700' },
                  '&.Mui-focused fieldset': { borderColor: '#ffd700' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' }
              }}
            />

            {/* Save Button */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveProfile}
                disabled={saving}
                sx={{
                  backgroundColor: '#ffd700',
                  color: '#000',
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: '#ffed4e'
                  },
                  '&:disabled': {
                    backgroundColor: '#666',
                    color: '#999'
                  }
                }}
              >
                {saving ? <CircularProgress size={20} sx={{ color: '#999' }} /> : 'Save Changes'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{
            p: 3,
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            <Typography
              variant="h6"
              sx={{
                mb: 3,
                fontWeight: 700,
                color: '#ffd700'
              }}
            >
              Account Information
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                Username
              </Typography>
              <Typography variant="h6" sx={{ color: '#fff' }}>
                {userData.username}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                Email
              </Typography>
              <Typography variant="h6" sx={{ color: '#fff' }}>
                {userData.email}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                Account Type
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: userData.accountType === 'seller' ? '#4caf50' : '#2196f3',
                  textTransform: 'capitalize'
                }}
              >
                {userData.accountType}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                Account Status
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: userData.isBanned === true ? '#f44336' : '#4caf50',
                  textTransform: 'capitalize'
                }}
              >
                {userData.isBanned === true ? 'Banned' : 'Active'}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                Credits Balance
              </Typography>
              <Typography variant="h6" sx={{ color: '#ffd700' }}>
                {userData.credits?.toLocaleString()} Credits
              </Typography>
            </Box>
          </Paper>


        </Grid>
      </Grid>

      <>
        {/* Verify Account */}
        <Paper sx={{
          mt: 3,
          p: 3,
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          <Box sx={{ mt: 4 }}>
            <Typography
              variant="h5"
              sx={{
                mb: 2,
                fontWeight: 700,
                color: '#36f44f',
                textAlign: 'center'
              }}
            >
              Verify
            </Typography>
            <Box sx={{ textAlign: 'center', gap: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="success"
                onClick={() => navigate('/verify-account')}
                sx={{
                  fontWeight: 700,
                  px: 4,
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: '#e5b035'
                  }
                }}
              >
                Verify Account
              </Button>

                <Button
                  variant="contained"
                  color="info"
                  onClick={() => navigate('/verify-email')}
                  sx={{
                    fontWeight: 700,
                    px: 4,
                    py: 1.5,
                    '&:hover': {
                      backgroundColor: '#61e535'
                    }
                  }}
                >
                  Email Address
                </Button>
            
            </Box>
          </Box>
        </Paper>

      </>

      {/* Delete Account */}
      <Paper sx={{
        mt: 3,
        p: 3,
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}>
        <Box sx={{ mt: 4 }}>
          <Typography
            variant="h5"
            sx={{
              mb: 2,
              fontWeight: 700,
              color: '#f44336',
              textAlign: 'center'
            }}
          >
            Danger Zone
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              color="error"
              onClick={() => navigate('/delete-account')}
              sx={{
                fontWeight: 700,
                px: 4,
                py: 1.5,
                '&:hover': {
                  backgroundColor: '#e53935'
                }
              }}
            >
              Delete Account
            </Button>
          </Box>
        </Box>

      </Paper>

      {/* Device Fingerprint Section */}
      <Box sx={{ mt: 3 }}>
        {/* <FingerprintDisplay showDetails={true} compact={false} /> */}
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert
          severity={snackbarMessage.startsWith('Error') ? 'error' : 'success'}
          sx={{
            backgroundColor: snackbarMessage.startsWith('Error') ? '#f44336' : '#4caf50',
            color: '#fff'
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AccountPage;
