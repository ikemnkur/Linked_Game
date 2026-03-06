import React, { useEffect, useState, useRef } from 'react';
import {
  Container,
  Stack,
  Typography,
  Card,
  CardContent,
  Divider,
  Skeleton,
  Box,
  Grid,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  CreditCard,
  AccountBalanceWallet,
  CurrencyBitcoin,
  Payment,
  Star,
  Timer,
  AttachMoney,
  Warning, OpenInNew, LocalOffer
} from '@mui/icons-material';
import PaymentButton from '../components/PaymentButton';
import api from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { fetchUserData } from '../utils/fetchUserData';

export default function Wallet() {
  const [balance, setBalance] = useState(null);
  const { success, error } = useToast();
  // const [userdata, setUserdata] = useState(JSON.parse(localStorage.getItem('userData')) || {});
  // const userdata = JSON.parse(localStorage.getItem('userdata')) || {};
  const [userdata, setUserData] = useState(fetchUserData());
  const [selected, setSelected] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isWaitingForReturn, setIsWaitingForReturn] = useState(false);
  const paymentWindowRef = useRef(null);
  const checkIntervalRef = useRef(null);

  const stripeCheckoutUrl_Basic = `https://buy.stripe.com/test_bJedR9fh54Xrd40f645AQ02?client_reference_id=${userdata.id}`; //`https://buy.stripe.com/test_14k14g6SH4bA7JG9AA`;
  const stripeCheckoutUrl_Standard = `https://buy.stripe.com/test_6oU7sLfh53Tn1li0ba5AQ01?client_reference_id=${userdata.id}`;
  const stripeCheckoutUrl_Premium = `https://buy.stripe.com/test_7sYcN58SH61v7JG9LK5AQ00?client_reference_id=${userdata.id}`;

  const plans = {
    free: {
      title: 'Free',
      priceLabel: 'Free',
      features: [
        'Ads',
        'Limits on file sizes',
        'Limited video and photo scrambling modes',
        'Simple un/scrambler algorithms',
        'Annoying watermarks',
        "file size limits",
        "Longest wait times"

      ]
    },
    basic: {
      title: 'Basic',
      priceLabel: '$2.50',
      features: [
        'No ads',
        'Standard quality video',
        'No Annoying Watermarks',
        'Normal unscrambling',
        "File size limits",
        'Audio scrambling/unscrambling',
        "Standard wait times"
      ]
    },
    standard: {
      title: 'Standard',
      priceLabel: '$5',
      features: [
        'Faster processing',
        'Longer videos',
        'Content leak prevention',
        'Advanced scrambling for photos',
        'HD videos',
        "Larger file size limits"
      ]
    },
    premium: {
      title: 'Premium',
      priceLabel: '$10',
      features: [
        'No wait times',
        'Advanced video scrambling',
        'Content leak prevention and detections',
        'Full HD and 4K videos',
        'Largest file size limits (250MB)',
        'Priority support'
      ]
    }
  };

  const p = plans[selectedPlan];

  // Fetch fresh user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      const freshUserData = await fetchUserData();
      if (freshUserData) {
        setUserData(freshUserData);
        console.log("Fetched user data on mount:", freshUserData);
        setTimeout(() => {
          load();
        }, 1000);
      }
      
    };

    loadUserData();
  }, []);

  function handleCancelPayment() {
    setShowModal(false);
    setPendingPlan(null);
    console.log("Payment cancelled by user");
  }

  function handleOpenStripeSubscriptionPage() {
    setMessage(null);
    setPendingPlan(p);
    setShowModal(true);
  }


  const load = async () => {
    try {
      const { data } = await api.post(`/api/wallet/balance/${userdata.username}`, { password: userdata.password, email: userdata.email });

      setBalance(data?.balance ?? 0);
    } catch (e) {
      console.error(e);
      setBalance(1001); // demo fallback
    }
  };




  function handleConfirmPayment() {
    if (!pendingPlan) return;

    // Record start timestamp
    const timestamp = Date.now();
    setStartTimestamp(timestamp);
    console.log("Subscription Payment Start Timestamp (Unix epoch ms):", timestamp);
    console.log("Subscription Payment Start Time:", new Date(timestamp).toISOString());

    // Open Stripe subscription page in new window based on selected plan
    let stripeUrl = '';
    if (selectedPlan === 'basic') stripeUrl = stripeCheckoutUrl_Basic;
    else if (selectedPlan === 'standard') stripeUrl = stripeCheckoutUrl_Standard;
    else if (selectedPlan === 'premium') stripeUrl = stripeCheckoutUrl_Premium;

    // check if user is already on the given plan, dont open stripe page if the user is already on the given plan
    const currentPlan = userdata?.accountType || 'free';
    if (currentPlan === selectedPlan) {
      alert( `You are already on the ${selectedPlan} plan, no payment is necessary.`);
      error("Unable to open payment page. Please try again.");
      setShowModal(false);
      return;
    }

    // check if user is accidentally trying to select a lower plan than current plan
    const planHierarchy = { free: 0, basic: 1, standard: 2, premium: 3 };
    if (planHierarchy[selectedPlan] < planHierarchy[currentPlan]) {
      alert( `You are already on the ${currentPlan} plan, please select a higher plan than your current plan.`);
      error("Unable to open payment page. Please try again.");
      setShowModal(false);
      return;
    }

    if (stripeUrl) {
      paymentWindowRef.current = window.open(stripeUrl, '_blank');
      console.log("Opening Stripe subscription page for:", selectedPlan, pendingPlan);

      // Start checking if window is closed
      // startWindowCheck();

      // Show waiting state
      setIsWaitingForReturn(true);
    }

    setSelected(pendingPlan);
    setShowModal(false);
  }

 
  // function startWindowCheck() {
  //   // Check every 1 second if the payment window was closed
  //   checkIntervalRef.current = setInterval(() => {
  //     try {
  //       // Only trigger if the window is actually closed, not just inaccessible
  //       if (paymentWindowRef.current && paymentWindowRef.current.closed) {
  //         // Double-check by trying to access the window
  //         // If it throws, it might be cross-origin but still open
  //         try {
  //           const stillOpen = !paymentWindowRef.current.closed;
  //           if (!stillOpen) {
  //             handlePaymentWindowClosed();
  //           }
  //         } catch (e) {
  //           // Cross-origin error means window is likely still open
  //           // Only close if we're certain it's closed
  //           if (paymentWindowRef.current.closed) {
  //             handlePaymentWindowClosed();
  //           }
  //         }
  //       }
  //     } catch (error) {
  //       // If we can't access the window at all, it's likely still open but cross-origin
  //       console.log("Window check error (window likely still open):", error);
  //     }
  //   }, 1000);
  // }

  // function handlePaymentWindowClosed() {
  //   // Clear the interval
  //   if (checkIntervalRef.current) {
  //     clearInterval(checkIntervalRef.current);
  //     checkIntervalRef.current = null;
  //   }

  //   // Record end timestamp
  //   const endTimestamp = Date.now();
  //   console.log("Payment End Timestamp (Unix epoch ms):", endTimestamp);
  //   console.log("Payment End Time:", new Date(endTimestamp).toISOString());
  //   console.log("Time Range:", {
  //     start: startTimestamp,
  //     end: endTimestamp,
  //     duration: `${((endTimestamp - startTimestamp) / 1000).toFixed(2)} seconds`
  //   });

  //   // Verify payment with backend
  //   verifyPayment(startTimestamp, endTimestamp);
  // }

  // async function fetchUserIP() {
  //   // Simple function to fetch user's IP address
  //   // In production, consider using a more reliable method or service
  //   return fetch('https://api.ipify.org?format=json')
  //     .then(response => response.json())
  //     .then(data => data.ip)
  //     .catch(error => {
  //       console.error("Error fetching user IP:", error);
  //       return null;
  //     });
  // }
  

  async function verifyPayment(startTime, endTime) {
    if (!pendingPlan) return;

    setIsVerifying(true);

    try {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('userdata') || '{}');

      // Extract price from priceLabel (e.g., "$10" -> 10)
      const planPrice = pendingPlan.priceLabel === 'Free' ? 0 : parseFloat(pendingPlan.priceLabel.replace('$', ''));

      const paymentData = {
        timeRange: {
          start: startTime,
          end: endTime
        },
        subscriptionData: {
          amount: Math.ceil(planPrice * 100), // in cents
          dollars: planPrice,
          plan: pendingPlan.title,
          planType: selectedPlan
        },
        user: {
          id: userData.id || '',
          email: userData.email || '',
          username: userData.username || '',
          phone: userData.phoneNumber || '',
          name: (userData.firstname || '') + " " + (userData.lastname || ''),
          ip: await fetchUserIP() || '',
          userAgent: navigator.userAgent || ''
        }
      };

      console.log("Sending subscription verification to backend:", paymentData);

      // Send to backend for verification
      const response = await api.post('/api/verify-stripe-subscription', paymentData);

      if (response.data && response.data.success) {
        setMessage(`Subscription verified! Your ${pendingPlan.title} plan is now active.`);
        console.log("Subscription verification successful:", response.data);
        // Reload user data to reflect new subscription
        const updatedUserData = await fetchUserData();
        setUserData(updatedUserData);
      } else {
        setMessage("Subscription verification pending. Please check your account or contact support if your plan doesn't activate within 5 minutes.");
        console.log("Subscription verification response:", response.data);
      }
    } catch (error) {
      console.error("Subscription verification error:", error);
      setMessage("Unable to verify subscription automatically. Please contact support with your transaction time: " + new Date(startTime).toISOString());
    } finally {
      setIsVerifying(false);
      setIsWaitingForReturn(false);
      setPendingPlan(null);
      setStartTimestamp(null);
      paymentWindowRef.current = null;
    }
  }

  function handleCancelPayment() {
    setShowModal(false);
    setPendingPlan(null);
    console.log("Payment cancelled by user");
  }

  function handleReturnFromPayment() {
    // User manually confirms they've returned
    const endTimestamp = Date.now();
    console.log("User returned from payment (manual confirmation)");
    console.log("Payment End Timestamp (Unix epoch ms):", endTimestamp);
    console.log("Payment End Time:", new Date(endTimestamp).toISOString());
    console.log("Time Range:", {
      start: startTimestamp,
      end: endTimestamp,
      duration: `${((endTimestamp - startTimestamp) / 1000).toFixed(2)} seconds`
    });

    // Clear interval and verify
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    setIsWaitingForReturn(false);
    verifyPayment(startTimestamp, endTimestamp);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);


  function handleSuccess(sessionOrResult) {
    // Called after successful payment (whatever your Stripe.jsx returns).
    setMessage("Payment successful — credits will appear in your account shortly.");
    setSelected(null);
    // TODO: call your backend to grant credits using sessionOrResult metadata
  }


  const onPaymentError = () => error('Payment could not be started');

  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4" color="secondary.main">Account Membership Overview</Typography>
        <Card variant="outlined">
          <CardContent>
            {/* <Typography variant="h6">Current Account Tier</Typography>

            {

            <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>
              {String(userdata?.accountType ?? localStorage.getItem("userdata")?.accountType ?? '').toUpperCase()}
            </Typography>
            
            <Divider sx={{ my: 2 }} /> */}

            {/* Subscription Plans Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star color="primary" />
                Subscribe & Save
              </Typography>

              <Grid container spacing={2}>

                {(() => {
                  const PlanSelector = () => {

                    // const [selectedPlan, setSelectedPlan] = useState('premium');

                    const plans = {
                      free: {
                        title: 'Free',
                        priceLabel: 'Free',
                        features: [
                          'Ads',
                          'Limits on file sizes',
                          'Limited video and photo scrambling modes',
                          'Simple un/scrambler algorithms',
                          'Annoying watermarks',
                          "file size limits",
                          "Longest wait times"

                        ]
                      },
                      basic: {
                        title: 'Basic',
                        priceLabel: '$2.50',
                        features: [
                          'No ads',
                          'Standard quality video',
                          'No Annoying Watermarks',
                          'Normal unscrambling',
                          "File size limits",
                          'Audio scrambling/unscrambling',
                          "Standard wait times"
                        ]
                      },
                      standard: {
                        title: 'Standard',
                        priceLabel: '$5',
                        features: [
                          'Faster processing',
                          'Longer videos',
                          'Content leak prevention',
                          'Advanced scrambling for photos',
                          'HD videos',
                          "Larger file size limits"
                        ]
                      },
                      premium: {
                        title: 'Premium',
                        priceLabel: '$10',
                        features: [
                          'No wait times',
                          'Advanced video scrambling',
                          'Content leak prevention and detections',
                          'Full HD and 4K videos',
                          'Largest file size limits (250MB)',
                          'Priority support'
                        ]
                      }
                    };

                    const p = plans[selectedPlan];

                    return (
                      <>
                        <Grid item xs={12} md={6}>
                          <Paper elevation={2} sx={{ p: 2, border: '2px solid', borderColor: 'primary.main', backgroundColor: '#424242' }}>
                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: 'white' }}>
                              <CreditCard color="primary" />
                              Stripe
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2, color: '#e0e0e0' }}>
                              Subscribe with Stripe and get bonus credits monthly!
                            </Typography>
                            <Stack spacing={1}>

                              <Button
                                amountUSD={10}
                                onError={onPaymentError}
                                onClick={() => setSelectedPlan('premium')}
                                sx={{
                                  backgroundColor: '#635bff',
                                  color: 'white',
                                  '&:hover': { backgroundColor: '#5248e8' },
                                  fontWeight: 'bold'
                                }}
                              >
                                Premium Plan - $10/month
                              </Button>
                              <Button
                                amountUSD={5}
                                onError={onPaymentError}
                                onClick={() => setSelectedPlan('standard')}
                                sx={{
                                  backgroundColor: '#4f46e5',
                                  color: 'white',
                                  '&:hover': { backgroundColor: '#4338ca' },
                                  fontWeight: 'bold'
                                }}
                              >
                                Standard Plan - $5/month
                              </Button>

                              <Button
                                amountUSD={2.5}
                                onError={onPaymentError}
                                onClick={() => setSelectedPlan('basic')}
                                sx={{
                                  backgroundColor: '#009cde',
                                  color: 'white',
                                  '&:hover': { backgroundColor: '#0087c7' },
                                  fontWeight: 'bold'
                                }}
                              >
                                Basic Plan - $2.50/month
                              </Button>

                              <Button
                                amountUSD={0}
                                onError={onPaymentError}
                                onClick={() => setSelectedPlan('free')}
                                sx={{
                                  backgroundColor: '#de1a00ff',
                                  color: 'white',
                                  '&:hover': { backgroundColor: '#c72b00ff' },
                                  fontWeight: 'bold'
                                }}
                              >
                                Free Plan (Lite) - $0/month (ADs)
                              </Button>

                              <Paper elevation={0} sx={{ mt: 1, p: 1, backgroundColor: 'transparent' }}>
                                <Typography variant="caption" sx={{ color: '#bdbdbd' }}>
                                  Tip: Click a plan to preview its details before completing payment.
                                </Typography>
                              </Paper>
                            </Stack>
                          </Paper>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          {/* Show plan details */}
                          <Paper elevation={2} sx={{ p: 2, border: '2px solid', borderColor: 'primary.main', backgroundColor: '#424242' }}>
                            <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                              Choose Plan: {p.title}{p.priceLabel && p.priceLabel !== 'Free' ? ` - ${p.priceLabel}/month` : p.priceLabel === 'Free' ? ' - Free' : ''}
                            </Typography>
                            <Stack spacing={1}>
                              {p.features.map((f, i) => (
                                <Typography key={i} variant="body2" sx={{ color: '#e0e0e0' }}>
                                  • {f}
                                </Typography>
                              ))}
                            </Stack>
                          </Paper>


                          <Divider sx={{ my: 2 }} />
                          {/* Subscribe button, opens stripe checkout page*/}
                          <Paper elevation={2} sx={{ p: 2, border: '2px solid', borderColor: 'primary.main', backgroundColor: '#424242' }}>
                            <Typography variant="h6" sx={{ mb: 1, color: 'white' }}>
                              Subscribe to {p.title} Plan
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2, color: '#e0e0e0' }}>
                              You will be redirected to Stripe to complete your subscription. Your plan will renew automatically each month until you cancel.
                            </Typography>

                            {/* <PaymentButton
                              amountUSD={p.priceLabel === 'Free' ? 0 : parseFloat(p.priceLabel.replace('$', ''))}
                              onError={onPaymentError}
                              onClick={() => handleOpenStripeSubscriptionPage({ plans })}
                              sx={{
                                backgroundColor: 'primary.main',
                                color: 'white',
                                '&:hover': { backgroundColor: 'primary.dark' },
                                fontWeight: 'bold',
                                width: '100%'
                              }}
                            >
                              Subscribe to {p.title} Plan
                            </PaymentButton> */}
                            <Button
                              onClick={() => handleOpenStripeSubscriptionPage()}
                              sx={{
                                backgroundColor: 'primary.main',
                                color: 'white',
                                '&:hover': { backgroundColor: 'primary.dark' },
                                fontWeight: 'bold',
                                width: '100%'
                              }}
                            >
                              Subscribe to {p.title} Plan
                            </Button>
                          </Paper>
                        </Grid>
                      </>
                    );
                  };

                  return <PlanSelector />;
                })()}
              </Grid>

            </Box>
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachMoney color="secondary" />
                Unsubscribe from Plans
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: '#e0e0e0' }}>
                To unsubscribe from your current subscription plan, please visit the respective payment provider's website (Stripe or PayPal) and manage your subscriptions there.
                Inactive account's (60 days) subscriptions will not renew automatically, and will be deleted in 90 days.
              </Typography>
            </Box>

          </CardContent>
        </Card>
      </Stack>

      {/* Checkout Section */}
      {selected && 0 && (
        <Paper elevation={4} sx={{ p: 4, backgroundColor: '#424242', color: 'white' }}>
          <Typography variant="h4" sx={{ mb: 2, color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCard />
            Checkout — {selected.dollars.toFixed(2)} USD
          </Typography>

          <Typography variant="body1" sx={{ mb: 3, color: '#e0e0e0' }}>
            You're buying <strong style={{ color: selected.color }}>{selected.credits.toLocaleString()}</strong> credits
            {selected.bonusCredits > 0 && <> (includes <strong style={{ color: selected.color }}>+{selected.bonusCredits.toLocaleString()} bonus</strong>)</>}
            .
          </Typography>

          {/* Stripe component */}
          <Box sx={{ mb: 3 }}>
            <Stripe
              credits={selected.credits}
              amount={Math.round(selected.dollars * 100)} // cents
              currency="usd"
              description={`${selected.credits} credits`}
              metadata={{ credits: selected.credits }}
              priceId={selected.priceId}
              onSuccess={handleSuccess}
            />
          </Box>

          <Typography variant="body2" sx={{ color: '#bdbdbd' }}>
            After payment you'll be redirected back. If you need invoices or support, contact support.
          </Typography>
        </Paper>
      )}

      {/* Payment Confirmation Modal */}
      <Dialog
        open={showModal}
        onClose={(event, reason) => {
          // Prevent closing on backdrop click or escape key
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return;
          }
          handleCancelPayment();
        }}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ backgroundColor: '#424242', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ color: '#ff9800' }} />
          Payment Window Notice
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: '#424242', color: 'white', pt: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              A new window will open to complete your payment securely through Stripe.
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: '#e0e0e0' }}>
              Please do not close this page until your payment is complete.
            </Typography>
            {pendingPlan && (
              <Paper sx={{ p: 2, backgroundColor: '#353535', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#bdbdbd', mb: 1 }}>
                  Subscription Details:
                </Typography>
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  {pendingPlan.title} Plan
                </Typography>
                <Typography variant="body1" sx={{ color: 'white', mb: 2 }}>
                  {pendingPlan.priceLabel === 'Free' ? 'Free' : `${pendingPlan.priceLabel}/month`}
                </Typography>
                <Typography variant="subtitle2" sx={{ color: '#bdbdbd', mb: 1 }}>
                  Features:
                </Typography>
                <Box sx={{ pl: 1 }}>
                  {pendingPlan.features.slice(0, 3).map((feature, idx) => (
                    <Typography key={idx} variant="body2" sx={{ color: '#e0e0e0', mb: 0.5 }}>
                      • {feature}
                    </Typography>
                  ))}
                  {pendingPlan.features.length > 3 && (
                    <Typography variant="body2" sx={{ color: '#bdbdbd' }}>
                      + {pendingPlan.features.length - 3} more features
                    </Typography>
                  )}
                </Box>
              </Paper>
            )}
            <Alert severity="info" sx={{ backgroundColor: '#1976d2', color: 'white' }}>
              After completing payment, return to this page. Your subscription will be verified and activated automatically.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: '#424242', p: 2 }}>
          <Button
            onClick={handleCancelPayment}
            variant="outlined"
            sx={{ color: '#bdbdbd', borderColor: '#bdbdbd' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPayment}
            variant="contained"
            startIcon={<OpenInNew />}
            sx={{ backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold' }}
          >
            Proceed to Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Waiting for Return from Payment Modal */}
      <Dialog
        open={isWaitingForReturn && !isVerifying}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        onClose={(event, reason) => {
          // Prevent closing on backdrop click or escape key
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return;
          }
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#424242', color: 'white', display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
          <OpenInNew sx={{ fontSize: 40, color: '#4caf50' }} />
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: '#424242', color: 'white', pt: 3, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
            Complete Your Payment
          </Typography>
          <Typography variant="body1" sx={{ color: '#e0e0e0', mb: 3 }}>
            A payment window has been opened. After you complete your subscription payment, click the button below to verify and activate your plan.
          </Typography>
          <Alert severity="info" sx={{ backgroundColor: '#1976d2', color: 'white', mb: 2 }}>
            Haven't completed payment yet? The payment window should still be open in another tab.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: '#424242', p: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleReturnFromPayment}
            sx={{ backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold', px: 4, py: 1.5 }}
          >
            I've Completed Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Verification Progress */}
      {isVerifying && (
        <Paper elevation={4} sx={{ p: 3, backgroundColor: '#424242', color: 'white', mb: 3, textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#4caf50', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Verifying Payment...
          </Typography>
          <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
            Please wait while we confirm your subscription and activate your plan.
          </Typography>
        </Paper>
      )}

      {/* Success Message */}
      {message && (
        <Alert
          severity="success"
          sx={{
            mt: 3,
            backgroundColor: '#2e7d32',
            color: 'white',
            '& .MuiAlert-icon': { color: 'white' }
          }}
        >
          {message}
        </Alert>
      )}
    </Container>
  );
}