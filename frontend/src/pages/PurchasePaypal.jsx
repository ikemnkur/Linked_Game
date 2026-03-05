// PurchasePaypal.jsx - PayPal Payment Integration (Coming Soon)
import React, { useState } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Alert
} from '@mui/material';
import {
  Payment,
  CheckCircle,
  Security,
  AccountBalance,
  Speed,
  NotificationsActive
} from '@mui/icons-material';
import { useToast } from '../contexts/ToastContext';

export default function PurchasePaypal() {
  const { success } = useToast();
  const [notifyRequested, setNotifyRequested] = useState(false);

  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem("userdata")));

  const handleNotifyMe = () => {
    setNotifyRequested(true);
    success('Thank you for your interest! We will notify you when this feature launches.');
  };

  const comingFeatures = [
    { icon: <Payment />, text: 'PayPal Payment Integration' },
    { icon: <Security />, text: 'Embedded Payment Applet' },
    { icon: <CheckCircle />, text: 'Secure Transaction Processing' },
    { icon: <AccountBalance />, text: 'Multiple Payment Options' },
    { icon: <Speed />, text: 'Easy Checkout Experience' }
  ];

  return (
    <Container sx={{ py: 4, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1
        }}
      />

      <Card
        elevation={10}
        sx={{
          maxWidth: 600,
          width: '100%',
          borderRadius: 4,
          overflow: 'visible'
        }}
      >
        <CardContent sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center' }}>
          {/* Icon */}
          <Box
            sx={{
              fontSize: '80px',
              mb: 3,
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                },
                '50%': {
                  transform: 'scale(1.05)',
                }
              }
            }}
          >
            💳
          </Box>

          {/* Title */}
          <Typography
            variant="h2"
            sx={{
              fontWeight: 'bold',
              color: '#333',
              mb: 2,
              fontSize: { xs: '2rem', sm: '2.5rem' }
            }}
          >
            Coming Soon!
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="h5"
            sx={{
              color: '#666',
              mb: 4,
              fontSize: { xs: '1.1rem', sm: '1.3rem' }
            }}
          >
            PayPal Payment Integration
          </Typography>

          {/* Features Section */}
          <Paper
            elevation={0}
            sx={{
              backgroundColor: '#f8f9fa',
              p: 4,
              borderRadius: 2,
              mb: 4,
              textAlign: 'left'
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: '#667eea',
                mb: 2,
                fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              What's Coming:
            </Typography>

            <List>
              {comingFeatures.map((feature, index) => (
                <ListItem key={index} sx={{ py: 1.5 }}>
                  <ListItemIcon sx={{ color: '#667eea', minWidth: 40 }}>
                    {feature.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={feature.text}
                    primaryTypographyProps={{
                      fontSize: '1.1rem',
                      color: '#555'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Info Alert */}
          {notifyRequested && (
            <Alert
              severity="success"
              icon={<CheckCircle />}
              sx={{ mb: 3, textAlign: 'left' }}
            >
              You'll be notified when PayPal payment integration is ready!
            </Alert>
          )}

          {/* Description */}
          <Typography
            variant="body1"
            sx={{
              color: '#888',
              mb: 3,
              fontSize: '1rem'
            }}
          >
            We're working hard to bring you seamless PayPal payment processing. Stay tuned!
          </Typography>

          {/* Notify Button */}
          <Button
            variant="contained"
            size="large"
            startIcon={<NotificationsActive />}
            onClick={handleNotifyMe}
            disabled={notifyRequested}
            sx={{
              background: notifyRequested ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '50px',
              px: 5,
              py: 2,
              fontSize: '1.1rem',
              textTransform: 'none',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: notifyRequested ? 'none' : 'translateY(-2px)',
                boxShadow: notifyRequested ? 'none' : '0 10px 20px rgba(0, 0, 0, 0.2)',
                background: notifyRequested ? '#ccc' : 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
              },
              '&:disabled': {
                color: 'white'
              }
            }}
          >
            {notifyRequested ? 'Notification Requested' : 'Notify Me When Ready'}
          </Button>

          {/* Additional Info */}
          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="body2" sx={{ color: '#999', mb: 1 }}>
              💡 <strong>Pro Tip:</strong> In the meantime, you can use our Stripe payment option for instant processing.
            </Typography>
            <Button
              variant="outlined"
              href="/purchase-stripe"
              sx={{
                mt: 2,
                borderColor: '#667eea',
                color: '#667eea',
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#764ba2',
                  backgroundColor: 'rgba(102, 126, 234, 0.04)'
                }
              }}
            >
              Try Stripe Payment →
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}