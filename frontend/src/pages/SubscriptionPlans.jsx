/**
 * SubscriptionPlans.jsx - Stripe Subscription Payment Page
 * 
 * Displays subscription plans and handles Stripe Checkout for recurring payments
 */

import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    CheckCircle as CheckIcon,
    Stars as StarsIcon,
    Bolt as BoltIcon,
    Diamond as DiamondIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51OPgiOEViYxfJNd2ZA0pYlZ3MKdsIHDEhE9vzihdcj6CUW99q7ULSgR44nWfNVwhKvEHJ1JQCaf1NcXGhTROu8Dh008XrwD0Hv');

const SubscriptionPlans = () => {
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001'; 

    // Subscription plans configuration
    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            price: 9.99,
            interval: 'month',
            stripePriceId: 'price_1SR08eEViYxfJNd2ihaRH9Fk', // Replace with your Stripe Price ID
            icon: <BoltIcon sx={{ fontSize: 40 }} />,
            color: '#4CAF50',
            features: [
                '1,000 credits per month',
                'Basic scrambling algorithms',
                // '5 active keys',
                // 'Email support',
                // 'Device fingerprinting',
                // 'Basic analytics'
                'No ads',
                'Standard quality video',
                'No watermark',
                'Normal unscrambling'
            ],
            popular: false
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 24.99,
            interval: 'month',
            stripePriceId: 'price_1SR09uEViYxfJNd2jL3JklFl', // Replace with your Stripe Price ID
            icon: <StarsIcon sx={{ fontSize: 40 }} />,
            color: '#2196F3',
            features: [
                '5,000 credits per month',
                // 'All scrambling algorithms',
                // 'Unlimited active keys',
                // 'Priority email support',
                // 'Advanced fingerprinting',
                // 'Detailed analytics',
                // 'API access',
                // 'Custom watermarks'
                'Faster processing',
                'Longer videos',
                'Advanced scrambling for photos',
                'HD videos'
            ],
            popular: true
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            price: 99.99,
            interval: 'month',
            stripePriceId: 'price_1SR0A9EViYxfJNd258I14txA', // Replace with your Stripe Price ID
            icon: <DiamondIcon sx={{ fontSize: 40 }} />,
            color: '#9C27B0',
            features: [
                // 'Unlimited credits',
                // 'All premium algorithms',
                // 'Unlimited everything',
                // '24/7 phone & email support',
                // 'Enterprise fingerprinting',
                // 'White-label options',
                // 'Dedicated account manager',
                // 'Custom integrations',
                // 'SLA guarantee',
                // 'Advanced security features'
                'No wait times',
                'Advanced video scrambling',
                'Video leak prevention / detections',
                'Full HD and 4K videos',
                'Largest file size limits',
                'Priority support'
            ],
            popular: false
        }
    ];

    useEffect(() => {
        loadCurrentSubscription();
    }, []);

    const loadCurrentSubscription = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('userdata') || '{}');
            if (!userData.id) return;

            
            const response = await fetch(`${API_URL}/api/subscription/current/${userData.id}`);

            if (response.ok) {
                const data = await response.json();
                setCurrentSubscription(data.subscription);
            }
        } catch (error) {
            console.error('Error loading subscription:', error);
        }
    };

    const handleSubscribe = async (plan) => {
        setLoading(true);
        setSelectedPlan(plan.id);

        try {
            const userData = JSON.parse(localStorage.getItem('userdata') || '{}');

            if (!userData.id) {
                // showToast('Please login to subscribe', 'error');
                navigate('/login');
                return;
            }

            // Create Stripe checkout session
            
            const response = await fetch(`${API_URL}/api/subscription/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userData.id,
                    username: userData.username,
                    email: userData.email,
                    priceId: plan.stripePriceId,
                    planId: plan.id,
                    planName: plan.name,
                    successUrl: `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancelUrl: `${window.location.origin}/subscription/plans`
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create checkout session');
            }

            // Redirect to Stripe Checkout
            const stripe = await stripePromise;
            const { error } = await stripe.redirectToCheckout({
                sessionId: data.sessionId
            });

            if (error) {
                throw new Error(error.message);
            }
        } catch (error) {
            console.error('Subscription error:', error);
            //   showToast(error.message || 'Failed to start subscription', 'error');
        } finally {
            setLoading(false);
            setSelectedPlan(null);
        }
    };

    const handleManageSubscription = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('userdata') || '{}');              
            const response = await fetch(`${API_URL}/api/subscription/portal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userData.id,
                    returnUrl: `${window.location.origin}/subscription/plans`
                })
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error opening portal:', error);
            //   showToast('Failed to open subscription portal', 'error');
        }
    };

    const handleCancelSubscription = async () => {
        try {
            const userData = JSON.parse(localStorage.getItem('userdata') || '{}');
            const response = await fetch(`${API_URL}/api/subscription/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: userData.id
                })
            });

            const data = await response.json();

            if (response.ok) {
                showToast('Subscription cancelled successfully', 'success');
                setCurrentSubscription(null);
                setCancelDialogOpen(false);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Cancel error:', error);
            //   showToast('Failed to cancel subscription', 'error');
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography variant="h3" gutterBottom fontWeight="bold">
                    Choose Your Plan
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                    Unlock premium features with a subscription
                </Typography>

                {currentSubscription && (
                    <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
                        You're currently subscribed to the <strong>{currentSubscription.planName}</strong> plan.
                        <Button
                            size="small"
                            onClick={handleManageSubscription}
                            sx={{ ml: 2 }}
                        >
                            Manage Subscription
                        </Button>
                    </Alert>
                )}
            </Box>

            <Grid container spacing={4} justifyContent="center">
                {plans.map((plan) => {
                    const isCurrentPlan = currentSubscription?.planId === plan.id;
                    const isLoading = loading && selectedPlan === plan.id;

                    return (
                        <Grid item xs={12} md={4} key={plan.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    border: plan.popular ? 3 : 1,
                                    borderColor: plan.popular ? plan.color : 'divider',
                                    transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                        transform: plan.popular ? 'scale(1.08)' : 'scale(1.03)',
                                    }
                                }}
                            >
                                {plan.popular && (
                                    <Chip
                                        label="Most Popular"
                                        color="primary"
                                        sx={{
                                            position: 'absolute',
                                            top: 16,
                                            right: 16,
                                            fontWeight: 'bold'
                                        }}
                                    />
                                )}

                                {isCurrentPlan && (
                                    <Chip
                                        label="Current Plan"
                                        color="success"
                                        sx={{
                                            position: 'absolute',
                                            top: 16,
                                            left: 16,
                                            fontWeight: 'bold'
                                        }}
                                    />
                                )}

                                <CardContent sx={{ flexGrow: 1, pt: 4 }}>
                                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                                        <Box
                                            sx={{
                                                bgcolor: `${plan.color}20`,
                                                color: plan.color,
                                                width: 80,
                                                height: 80,
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mx: 'auto',
                                                mb: 2
                                            }}
                                        >
                                            {plan.icon}
                                        </Box>

                                        <Typography variant="h4" fontWeight="bold" gutterBottom>
                                            {plan.name}
                                        </Typography>

                                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', mb: 2 }}>
                                            <Typography variant="h3" fontWeight="bold" color={plan.color}>
                                                ${plan.price}
                                            </Typography>
                                            <Typography variant="h6" color="text.secondary" sx={{ ml: 1 }}>
                                                /{plan.interval}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <List>
                                        {plan.features.map((feature, index) => (
                                            <ListItem key={index} sx={{ py: 0.5 }}>
                                                <ListItemIcon sx={{ minWidth: 36 }}>
                                                    <CheckIcon color="success" fontSize="small" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={feature}
                                                    primaryTypographyProps={{ variant: 'body2' }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>

                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    <Button
                                        variant={plan.popular ? 'contained' : 'outlined'}
                                        fullWidth
                                        size="large"
                                        onClick={() => handleSubscribe(plan)}
                                        disabled={loading || isCurrentPlan}
                                        sx={{
                                            bgcolor: plan.popular ? plan.color : 'transparent',
                                            borderColor: plan.color,
                                            color: plan.popular ? 'white' : plan.color,
                                            '&:hover': {
                                                bgcolor: plan.popular ? plan.color : `${plan.color}10`,
                                                borderColor: plan.color,
                                            }
                                        }}
                                    >
                                        {isLoading ? (
                                            <CircularProgress size={24} />
                                        ) : isCurrentPlan ? (
                                            'Current Plan'
                                        ) : (
                                            `Subscribe to ${plan.name}`
                                        )}
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {currentSubscription && (
                <Box sx={{ textAlign: 'center', mt: 6 }}>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => setCancelDialogOpen(true)}
                    >
                        Cancel Subscription
                    </Button>
                </Box>
            )}

            {/* Cancel Confirmation Dialog */}
            <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
                <DialogTitle>Cancel Subscription?</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelDialogOpen(false)}>
                        Keep Subscription
                    </Button>
                    <Button onClick={handleCancelSubscription} color="error" variant="contained">
                        Yes, Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default SubscriptionPlans;
