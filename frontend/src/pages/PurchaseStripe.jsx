import React, { useState, useEffect, useRef, use } from "react";
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Paper,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  CreditCard,
  LocalOffer,
  TrendingUp,
  CheckCircle,
  OpenInNew,
  Warning
} from '@mui/icons-material';
import Stripe from "../components/Stripe";
import api from '../api/client';

const PACKAGES = [
  { credits: 2500, dollars: 2.5, label: "$2.50", color: '#4caf50', priceId: 'price_1SR9nNEViYxfJNd2pijdhiBM' },
  { credits: 5250, dollars: 5, label: "$5.00", color: '#2196f3', priceId: 'price_1SR9lZEViYxfJNd20x2uwukQ' },
  { credits: 11200, dollars: 10, label: "$10.00", color: '#9c27b0', priceId: 'price_1SR9kzEViYxfJNd27aLA7kFW' },
  { credits: 26000, dollars: 20, label: "$20.00", color: '#f57c00', popular: true, priceId: 'price_1SR9mrEViYxfJNd2dD5NHFoL' },
];

// Incentive multipliers by package amount (bigger packages get larger bonus)
const MULTIPLIERS = {
  2.5: 1.00, // no bonus
  5: 1.05,   // 5% bonus
  10: 1.12,  // 12% bonus
  20: 1.30,  // 30% bonus
};


function computePackageInfo(dollars, amountOfCredits) {
  const multiplier = MULTIPLIERS[dollars] || 1;
  const credits = Math.round(dollars * 1000 * multiplier);
  const effectivePricePer1000 = dollars / (credits / 1000); // $ per 1000 credits
  const discountPercent = Math.max(0, Math.round((1 - effectivePricePer1000) * 100));
  const bonusCredits = credits - Math.round(dollars * 1000);
  return { dollars, credits, multiplier, effectivePricePer1000, discountPercent, bonusCredits };
}

export default function PurchaseStripe() {
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pendingPackage, setPendingPackage] = useState(null);
  const [startTimestamp, setStartTimestamp] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isWaitingForReturn, setIsWaitingForReturn] = useState(false);
  const paymentWindowRef = useRef(null);
  const checkIntervalRef = useRef(null);

  const [userData, setUserData] = useState(() => {
    const stored = localStorage.getItem('userdata');
    return stored ? JSON.parse(stored) : {};
  });

  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('usd');
  const [rate, setRate] = useState(1); // credits per unit currency


  const packageInfos = PACKAGES.map(p => ({
    ...computePackageInfo(p.dollars, p.credits),
    color: p.color,
    popular: p.popular,
    priceId: p.priceId
  }));

  function handleSelect(pkgInfo) {
    setMessage(null);
    setSelected(pkgInfo);
  }

  const stripeCheckoutUrl_2_5 = `https://buy.stripe.com/test_14A9ATed1blP9RO8HG5AQ03?client_reference_id=${userData.id}`;
  const stripeCheckoutUrl_5 = `https://buy.stripe.com/test_28E4gz0mb61v5By1fe5AQ04?client_reference_id=${userData.id}`;
  const stripeCheckoutUrl_10 = `https://buy.stripe.com/test_bJefZh7ODdtXbZWe205AQ05?client_reference_id=${userData.id}`;
  const stripeCheckoutUrl_20 = `https://buy.stripe.com/test_3cIeVded14XraVS9LK5AQ06?client_reference_id=${userData.id}`;

  function handleOpenStripePaymentPage(pkgInfo) {
    setMessage(null);
    setPendingPackage(pkgInfo);
    setShowModal(true);
  }


  const load = async () => {
    try {
      const { data } = await api.post(`/api/wallet/balance/${userData.username}`, { Password: userData.password, email: userData.email });

      setBalance(data?.balance ?? 0);
    } catch (e) {
      console.error(e);
      setBalance(1001); // demo fallback
    }
  };


  useEffect(() => {
    load();
    // Fetch initial rate
    // fetchCryptoRate(currency).then(setRate);
  }, []);


  function handleConfirmPayment() {
    if (!pendingPackage) return;

    // Record start timestamp
    const timestamp = Date.now();
    setStartTimestamp(timestamp);
    console.log("Payment Start Timestamp (Unix epoch ms):", timestamp);
    console.log("Payment Start Time:", new Date(timestamp).toISOString());

    // Open Stripe payment page in new window
    let stripeUrl = '';
    if (pendingPackage.dollars === 2.5) stripeUrl = stripeCheckoutUrl_2_5;
    else if (pendingPackage.dollars === 5) stripeUrl = stripeCheckoutUrl_5;
    else if (pendingPackage.dollars === 10) stripeUrl = stripeCheckoutUrl_10;
    else if (pendingPackage.dollars === 20) stripeUrl = stripeCheckoutUrl_20;

    if (stripeUrl) {
      paymentWindowRef.current = window.open(stripeUrl, '_blank');
      console.log("Opening Stripe payment page for:", pendingPackage);

      // Start checking if window is closed
      startWindowCheck();

      // Show waiting state
      setIsWaitingForReturn(true);
    }

    setSelected(pendingPackage);
    setShowModal(false);
  }

  function startWindowCheck() {
    // Check every 1 second if the payment window was closed
    checkIntervalRef.current = setInterval(() => {
      try {
        // Only trigger if the window is actually closed, not just inaccessible
        if (paymentWindowRef.current && paymentWindowRef.current.closed) {
          // Double-check by trying to access the window
          // If it throws, it might be cross-origin but still open
          try {
            const stillOpen = !paymentWindowRef.current.closed;
            if (!stillOpen) {
              handlePaymentWindowClosed();
            }
          } catch (e) {
            // Cross-origin error means window is likely still open
            // Only close if we're certain it's closed
            if (paymentWindowRef.current.closed) {
              handlePaymentWindowClosed();
            }
          }
        }
      } catch (error) {
        // If we can't access the window at all, it's likely still open but cross-origin
        console.log("Window check error (window likely still open):", error);
      }
    }, 1000);
  }

  function handlePaymentWindowClosed() {
    // Clear the interval
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    // Record end timestamp
    const endTimestamp = Date.now();
    console.log("Payment End Timestamp (Unix epoch ms):", endTimestamp);
    console.log("Payment End Time:", new Date(endTimestamp).toISOString());
    console.log("Time Range:", {
      start: startTimestamp,
      end: endTimestamp,
      duration: `${((endTimestamp - startTimestamp) / 1000).toFixed(2)} seconds`
    });

    // Verify payment with backend
    verifyPayment(startTimestamp, endTimestamp);
  }

  async function fetchUserIP() {
    // Simple function to fetch user's IP address
    // In production, consider using a more reliable method or service
    return fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => data.ip)
      .catch(error => {
        console.error("Error fetching user IP:", error);
        return null;
      });
  }

  async function verifyPayment(startTime, endTime) {
    if (!pendingPackage) return;

    setIsVerifying(true);

    try {
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('userdata') || '{}');

      const paymentData = {
        timeRange: {
          start: startTime,
          end: endTime
        },
        packageData: {
          amount: Math.ceil(pendingPackage.dollars * 100), // in cents
          dollars: pendingPackage.dollars,
          credits: pendingPackage.credits,
          priceId: pendingPackage.priceId
        },
        user: {
          id: userData.id || '',
          email: userData.email || '',
          username: userData.username || '',
          phone: userData.phoneNumber || '',
          name: userData.firstname + " " + userData.lastname || '',
          ip: await fetchUserIP() || '',
          userAgent: navigator.userAgent || '',

        }
      };

      console.log("Sending payment verification to backend:", paymentData);

      // Send to backend for verification
      const response = await api.post('/api/verify-stripe-payment', paymentData);

      if (response.data && response.data.success) {
        setMessage(`Payment verified! ${pendingPackage.credits.toLocaleString()} credits have been added to your account.`);
        console.log("Payment verification successful:", response.data);
      } else {
        setMessage("Payment verification pending. Please check your account or contact support if credits don't appear within 5 minutes.");
        console.log("Payment verification response:", response.data);
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setMessage("Unable to verify payment automatically. Please contact support with your transaction time: " + new Date(startTime).toISOString());
    } finally {
      setIsVerifying(false);
      setIsWaitingForReturn(false);
      setPendingPackage(null);
      setStartTimestamp(null);
      paymentWindowRef.current = null;
    }
  }

  function handleCancelPayment() {
    setShowModal(false);
    setPendingPackage(null);
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

  return (
    <Container sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" color="primary.main" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <CreditCard />
          Buy Credits
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Base rate: 1000 credits = $1. Larger packages include bonus credits — better value per 1000 credits.
        </Typography>
      </Box>

      {/* Package Selection */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {packageInfos.map((pkg) => (
          <Grid item xs={12} sm={6} md={3} key={pkg.dollars}>
            <Card
              elevation={pkg.popular ? 8 : 2}
              sx={{
                height: '100%',
                position: 'relative',
                border: selected === pkg ? '3px solid' : (pkg.popular ? '2px solid' : 'none'),
                borderColor: selected === pkg ? pkg.color : (pkg.popular ? 'primary.main' : 'transparent'),
                backgroundColor: '#424242',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
              onClick={() => handleSelect(pkg)}
            >
              {pkg.popular && (
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
                  <TrendingUp fontSize="small" />
                  <Typography variant="caption" fontWeight="bold" sx={{ paddingTop: '5px' }}>
                    BEST VALUE
                  </Typography>
                </Box>
              )}

              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: pkg.color, mb: 1 }}>
                  {pkg.dollars.toFixed(2)} USD
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {pkg.credits.toLocaleString()} Credits
                  </Typography>
                  {/* {pkg.bonusCredits > 0 && ( */}
                  <Chip
                    icon={<LocalOffer />}
                    label={`+${pkg.bonusCredits.toLocaleString()} Bonus`}
                    size="small"
                    sx={{
                      mt: 1,
                      backgroundColor: pkg.color,
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                  {/* )} */}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
                    Effective Rate
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', color: pkg.color }}>
                    ${pkg.effectivePricePer1000.toFixed(2)} per 1000 credits
                  </Typography>
                </Box>

                {/* {pkg.discountPercent > 0 && ( */}
                <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 'bold', mb: 2 }}>
                  Save {pkg.discountPercent}% vs base rate
                </Typography>
                {/* )} */}

                <Button
                  variant="contained"
                  fullWidth
                  sx={{
                    backgroundColor: selected === pkg ? '#2e7d32' : pkg.color,
                    color: 'white',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: selected === pkg ? '#2e7d32' : pkg.color,
                      opacity: 0.9,
                    },
                  }}
                  onClick={() => handleOpenStripePaymentPage(pkg)}
                >
                  {selected === pkg ? (
                    <>
                      <CheckCircle sx={{ mr: 1 }} />
                      Selected
                    </>
                  ) : (
                    'Select Package'
                  )}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

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
            {pendingPackage && (
              <Paper sx={{ p: 2, backgroundColor: '#353535', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#bdbdbd', mb: 1 }}>
                  Package Details:
                </Typography>
                <Typography variant="h6" sx={{ color: pendingPackage.color, fontWeight: 'bold' }}>
                  {pendingPackage.credits.toLocaleString()} Credits
                </Typography>
                <Typography variant="body1" sx={{ color: 'white' }}>
                  ${pendingPackage.dollars.toFixed(2)} USD
                </Typography>
                {pendingPackage.bonusCredits > 0 && (
                  <Chip
                    icon={<LocalOffer />}
                    label={`+${pendingPackage.bonusCredits.toLocaleString()} Bonus Credits`}
                    size="small"
                    sx={{ mt: 1, backgroundColor: pendingPackage.color, color: 'white' }}
                  />
                )}
              </Paper>
            )}
            <Alert severity="info" sx={{ backgroundColor: '#1976d2', color: 'white' }}>
              After completing payment, return to this page. Your credits will be verified and added automatically.
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

      {/* Waiting for Return from Payment */}
      {isWaitingForReturn && !isVerifying && (
        <Paper elevation={4} sx={{ p: 3, backgroundColor: '#424242', color: 'white', mb: 3, textAlign: 'center' }}>
          <OpenInNew sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
            Complete Your Payment
          </Typography>
          <Typography variant="body1" sx={{ color: '#e0e0e0', mb: 3 }}>
            A payment window has been opened. After you complete your payment, click the button below to verify and credit your account.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleReturnFromPayment}
            sx={{ backgroundColor: '#4caf50', color: 'white', fontWeight: 'bold', px: 4, py: 1.5 }}
          >
            I've Completed Payment
          </Button>
          <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#bdbdbd' }}>
            Haven't completed payment yet? The payment window should still be open in another tab.
          </Typography>
        </Paper>
      )}

      {/* Verification Progress */}
      {isVerifying && (
        <Paper elevation={4} sx={{ p: 3, backgroundColor: '#424242', color: 'white', mb: 3, textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#4caf50', mb: 2 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Verifying Payment...
          </Typography>
          <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
            Please wait while we confirm your transaction and credit your account.
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