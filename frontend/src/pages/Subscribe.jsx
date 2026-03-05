import React from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  List, 
  ListItem, 
  ListItemText,
  Box,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle } from '@mui/icons-material';

const PLANS = [
  { 
    id: 'basic', 
    title: 'Basic', 
    price: 2.50, 
    priceLabel: '$2.50/mo', 
    features: ['3000 Credits', 'Ad Free'],
    color: '#4caf50'
  },
  { 
    id: 'standard', 
    title: 'Standard', 
    price: 5.00, 
    priceLabel: '$5/mo', 
    features: ['7500 Credits', 'No daily limits', 'No Watermarks'],
    color: '#2196f3',
    popular: true
  },
  { 
    id: 'pro', 
    title: 'Pro', 
    price: 10.00, 
    priceLabel: '$10/mo', 
    features: ['15000 Credits', 'No wait/Fast track', 'Advanced scrambler options'],
    color: '#9c27b0'
  },
];

export default function Subscribe() {
  const navigate = useNavigate();

  const handleSubscribe = (planId) => {
    navigate(`/subscribe-confirmation?plan=${planId}`);
  };

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" color="primary.main" sx={{ mb: 2, fontWeight: 'bold' }}>
          Choose Your Plan
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Select the plan that fits you. Click Subscribe to continue.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {PLANS.map((plan) => (
          <Grid item xs={12} md={4} key={plan.id}>
            <Card 
              elevation={plan.popular ? 8 : 2}
              sx={{ 
                height: '100%',
                position: 'relative',
                border: plan.popular ? '3px solid' : 'none',
                borderColor: plan.popular ? 'primary.main' : 'transparent',
                backgroundColor: '#424242',
                color: 'white'
              }}
            >
              {plan.popular && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'primary.main',
                    color: 'white',
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <Star fontSize="small" />
                  <Typography variant="caption" fontWeight="bold">
                    POPULAR
                  </Typography>
                </Box>
              )}
              
              <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {plan.title}
                  </Typography>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      fontWeight: 'bold', 
                      color: plan.color,
                      mb: 1 
                    }}
                  >
                    {plan.priceLabel}
                  </Typography>
                </Box>

                <List sx={{ flexGrow: 1, mb: 2 }}>
                  {plan.features.map((feature, index) => (
                    <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                      <CheckCircle 
                        sx={{ 
                          color: plan.color, 
                          mr: 1, 
                          fontSize: '1.2rem' 
                        }} 
                      />
                      <ListItemText 
                        primary={feature} 
                        sx={{ 
                          '& .MuiListItemText-primary': { 
                            color: 'white',
                            fontSize: '1rem'
                          } 
                        }} 
                      />
                    </ListItem>
                  ))}
                </List>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => handleSubscribe(plan.id)}
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
                  Subscribe to {plan.title}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          backgroundColor: '#f5f5f5', 
          borderLeft: '4px solid',
          borderColor: 'info.main' 
        }}
      >
        <Typography variant="body2" color="text.secondary">
          💡 <strong>Note:</strong> This page is a client-side example. On subscribe, users are sent to a confirmation page for details and final confirmation.
        </Typography>
      </Paper>
    </Container>
  );
}