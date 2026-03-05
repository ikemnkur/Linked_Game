import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Alert, 
  Box, 
  List, 
  ListItem, 
  ListItemText,
  Divider,
  Paper,
  CircularProgress
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowBack, CheckCircle, CreditCard } from '@mui/icons-material';
import { useToast } from '../contexts/ToastContext';

const PLANS = {
  basic: { 
    id: 'basic', 
    title: 'Basic', 
    price: 2.5, 
    priceLabel: '$2.50/mo', 
    features: ['3000 Credits', 'Ad Free'],
    color: '#4caf50'
  },
  standard: { 
    id: 'standard', 
    title: 'Standard', 
    price: 5, 
    priceLabel: '$5.00/mo', 
    features: ['75000 Credits', 'No daily limits', 'No Watermarks'],
    color: '#2196f3'
  },
  pro: { 
    id: 'pro', 
    title: 'Pro', 
    price: 10, 
    priceLabel: '$10.00/mo', 
    features: ['15000 Credits', 'No wait/Fast track', 'Advanced scrambler options'],
    color: '#9c27b0'
  },
};

export default function SubscribeConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    billing: 'monthly',
    payment: 'card'
  });
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Get plan from URL params
  const params = new URLSearchParams(location.search);
  const selectedPlanId = params.get('plan') || 'standard';
  const plan = PLANS[selectedPlanId] || PLANS.standard;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatePrice = () => {
    const basePrice = plan.price;
    if (formData.billing === 'yearly') {
      return Math.round(basePrice * 12 * 0.85); // 15% discount for yearly
    }
    return basePrice;
  };

  const getPriceLabel = () => {
    if (formData.billing === 'yearly') {
      return `$${calculatePrice()}/year (Save 15%)`;
    }
    return plan.priceLabel;
  };

  const fakeSubscribe = (payload) => {
    return new Promise((resolve, reject) => {
      // Basic validations
      if (!payload.email || !payload.name) {
        return reject(new Error('Missing name or email'));
      }
      
      // Simulate network latency and random failure
      setTimeout(() => {
        if (Math.random() < 0.9) {
          resolve({ ok: true, id: 'sub_' + Date.now() });
        } else {
          reject(new Error('Payment provider declined the transaction'));
        }
      }, 1500);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      plan: plan.id,
      name: formData.name.trim(),
      email: formData.email.trim(),
      billing: formData.billing,
      payment: formData.payment,
      amount: calculatePrice()
    };

    try {
      await fakeSubscribe(data);
      setSubscribed(true);
      success(`Subscription successful! Welcome to the ${plan.title} plan. A confirmation was sent to ${data.email}.`);
    } catch (err) {
      error(`Subscription failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <Container sx={{ py: 4 }}>
        <Card sx={{ maxWidth: 600, mx: 'auto', backgroundColor: '#424242' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" sx={{ mb: 2, color: 'white', fontWeight: 'bold' }}>
              Welcome to {plan.title}!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, color: '#e0e0e0' }}>
              Your subscription is now active. You should receive a confirmation email shortly.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/wallet')}
              size="large"
            >
              Go to Wallet
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/subscribe')}
        sx={{ mb: 3, color: 'primary.main' }}
      >
        Back to Plans
      </Button>

      <Card sx={{ maxWidth: 800, mx: 'auto', backgroundColor: '#424242' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Plan Summary */}
          <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: '#353535' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                {plan.title}
              </Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: plan.color }}>
                  {getPriceLabel()}
                </Typography>
                <Typography variant="caption" sx={{ color: '#bdbdbd' }}>
                  {plan.features[0]}
                </Typography>
              </Box>
            </Box>
            
            <List dense>
              {plan.features.map((feature, index) => (
                <ListItem key={index} sx={{ px: 0, py: 0.25 }}>
                  <CheckCircle sx={{ color: plan.color, mr: 1, fontSize: '1rem' }} />
                  <ListItemText 
                    primary={feature} 
                    sx={{ '& .MuiListItemText-primary': { color: '#e0e0e0' } }}
                  />
                </ListItem>
              ))}
            </List>
            
            <Typography variant="body2" sx={{ mt: 2, color: '#bdbdbd' }}>
              You're about to subscribe to the <strong style={{ color: plan.color }}>{plan.title}</strong> plan.
            </Typography>
          </Paper>

          {/* Subscription Form */}
          <form onSubmit={handleSubmit}>
            <Typography variant="h6" sx={{ mb: 2, color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CreditCard />
              Complete Your Subscription
            </Typography>
            
            <Box sx={{ display: 'grid', gap: 2, mb: 3 }}>
              <TextField
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                placeholder="Jane Doe"
                sx={{
                  '& .MuiInputLabel-root': { color: '#bdbdbd' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: '#666' },
                    '&:hover fieldset': { borderColor: '#999' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                  }
                }}
              />
              
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                placeholder="you@example.com"
                sx={{
                  '& .MuiInputLabel-root': { color: '#bdbdbd' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: '#666' },
                    '&:hover fieldset': { borderColor: '#999' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                  }
                }}
              />
              
              <FormControl>
                <InputLabel sx={{ color: '#bdbdbd' }}>Billing Interval</InputLabel>
                <Select
                  value={formData.billing}
                  onChange={(e) => handleInputChange('billing', e.target.value)}
                  label="Billing Interval"
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#999' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                  }}
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="yearly">Yearly (Save 15%)</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl>
                <InputLabel sx={{ color: '#bdbdbd' }}>Payment Method</InputLabel>
                <Select
                  value={formData.payment}
                  onChange={(e) => handleInputChange('payment', e.target.value)}
                  label="Payment Method"
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#666' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#999' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' }
                  }}
                >
                  <MenuItem value="card">Stripe</MenuItem>
                  <MenuItem value="paypal">PayPal</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                backgroundColor: plan.color,
                color: 'white',
                fontWeight: 'bold',
                py: 1.5,
                '&:hover': {
                  backgroundColor: plan.color,
                  opacity: 0.9,
                },
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                  Processing...
                </>
              ) : (
                `Confirm Subscription - ${getPriceLabel()}`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}