import React from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Home,
  Receipt,
  CreditCard
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function PurchaseStripeSuccessful() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 8, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper
        elevation={6}
        sx={{
          p: 6,
          backgroundColor: '#1a1a1a',
          border: '3px solid #2e7d32',
          borderRadius: 4,
          textAlign: 'center'
        }}
      >
        {/* Success Icon */}
        <Box sx={{ mb: 3 }}>
          <CheckCircle
            sx={{
              fontSize: 100,
              color: '#2e7d32',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' }
              }
            }}
          />
        </Box>

        {/* Success Message */}
        <Typography variant="h3" sx={{ color: '#2e7d32', fontWeight: 'bold', mb: 2 }}>
          Payment Successful!
        </Typography>

        <Typography variant="h6" sx={{ color: '#ffd700', mb: 2 }}>
          Thank You for Your Purchase! 🎉
        </Typography>

        <Typography variant="body1" sx={{ color: '#ccc', mb: 4, lineHeight: 1.8 }}>
          Your payment has been processed successfully. Your credits will be added to your account shortly.
          We appreciate your trust in our service!
        </Typography>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Home />}
            onClick={() => navigate('/dashboard')}
            sx={{
              backgroundColor: '#ffd700',
              color: '#0a0a0a',
              fontWeight: 'bold',
              py: 1.5,
              '&:hover': {
                backgroundColor: '#e6c200'
              }
            }}
          >
            Go to Main Page
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={<Receipt />}
            onClick={() => navigate('/purchase-history')}
            sx={{
              borderColor: '#2e7d32',
              color: '#2e7d32',
              py: 1.5,
              '&:hover': {
                backgroundColor: '#2e7d3220',
                borderColor: '#2e7d32'
              }
            }}
          >
            View Purchase History
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={<CreditCard />}
            onClick={() => navigate('/wallet')}
            sx={{
              borderColor: '#ffd700',
              color: '#ffd700',
              py: 1.5,
              '&:hover': {
                backgroundColor: '#ffd70020',
                borderColor: '#ffd700'
              }
            }}
          >
            Buy More Credits
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
       