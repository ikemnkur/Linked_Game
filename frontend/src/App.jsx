import { useState, useEffect, useCallback } from 'react'
import React from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
// import YourKeys from './pages/YourKeys';
import Wallet from './pages/Wallet';
import VerifyAccount from './pages/VerifyAccount';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// import CreateKey from './pages/CreateKey';
// import Unlock from './pages/Unlock';
// import Earnings from './pages/Earnings';
import Auth from './components/Auth';
import HelpPage from './pages/HelpPage';
import Main from './pages/Main';
import PurchaseHistory from './pages/PurchaseHistory';
// import Redeem from './pages/Redeem';
import ProtectedRoute from './components/ProtectedRoute';
import Account from './pages/Account';
// import { fetchUserProfile } from './api/client';
import { useNavigate } from 'react-router-dom';
// import YourKeys from './pages/YourKeys';
// import Listings from './pages/Listing';
import Purchase from './pages/PurchaseCrypto';
import PurchaseCrypto from './pages/PurchaseCrypto';
import PurchaseCashApp from './pages/PurchaseCashApp';
import PurchasePaypal from './pages/PurchasePaypal';
import PurchaseStripe from './pages/PurchaseStripe';
import Info from './pages/Info';
// import SignUp2Unlock from './pages/SignUp2Unlock';
// import UnlockPreview from './pages/UnlockPreview';
import LoadingPage from './pages/Loading';

import VideoScrambler from './pages/VideoScrambler';
import VideoScramblerBasic from './pages/VideoScramblerBasic';
import VideoUnscrambler from './pages/VideoUnscrambler';
import VideoUnscramblerBasic from './pages/VideoUnscramblerBasic';

import PhotoScrambler from './pages/PhotoScrambler';
import PhotoScramblerBasic from './pages/PhotoScramblerBasic';
import PhotoUnscrambler from './pages/PhotoUnscrambler';
import PhotoUnscramblerBasic from './pages/PhotoUnscramblerBasic';

import AudioScrambler from './pages/AudioScrambler';
import AudioScramblerPro from './pages/AudioScramblerPro';
import AudioUnscrambler from './pages/AudioUnscrambler';
import AudioUnscramblerPro from './pages/AudioUnscramblerPro';
import AudioTagging from './pages/AudioTagging';
import AudioWatermarkEncoder from './pages/AudioWatermarkEncoder';
// import AudioWatermarkDetector from './pages/AudioWatermarkDetector';
import AudioWatermarkDetectorGoertzel from './pages/AudioWatermarkDetectorGoertzel';
import TestSpellOutUsername from './pages/TestSpellOutUsername';


import PhotoScramblerPro from './pages/PhotoScramblerPro';
import PhotoUnscramblerPro from './pages/PhotoUnscramblerPro';

import VideoScramblerStandard from './pages/VideoScramblerStandard';
import VideoUnscramblerStandard from './pages/VideoUnscramblerStandard';

import VideoScramblerPro from './pages/VideoScramblerPro';
import VideoUnscramblerPro from './pages/VideoUnscramblerPro';

import PhotoLeakChecker from './pages/PhotoLeakChecker';
import VideoLeakChecker from './pages/VideoLeakChecker';
import AudioLeakChecker from './pages/AudioLeakChecker';

import Plans from './pages/Plans';

// import CheckoutForm from './components/CheckoutForm';
// import { StripeCheckoutForm, Return } from "./components/Stripe";
import { StripeCheckoutForm, Return } from "./components/Stripe";


import Subscribe from './pages/Subscribe';
import SubscribeConfirmation from './pages/SubscribeConfirmation';
// import PurchaseCrypto from './pages/PurchaseCrypto';
// import PurchaseStripe from './pages/PurchaseStripe';

import SubscriptionPlans from './pages/SubscriptionPlans';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import BonusCredits from './pages/BonusCredits';
import PurchaseStripeSuccessful from './pages/PurchaseStripeSuccesful';
import TestGoogleTTS from './pages/TestGoogleTTS';
// import Intro from './pages/Intro';
//

import { loadStripe } from '@stripe/stripe-js';

import './styles.css';
import { ToastProvider } from './contexts/ToastContext';
import { FingerprintProvider } from './contexts/FingerprintContext';
import ErrorBoundary from './components/ErrorBoundary';
import { fetchUserData } from './utils/fetchUserData';

// import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { GA_TRACKING_ID, pageview } from './utils/gtag';


// A component to track page views
function TrackPageViews() {
  const location = useLocation();
  React.useEffect(() => {
    if (GA_TRACKING_ID) {
      pageview(location.pathname);
    }
  }, [location]);
  return null;
}



export default function App() {
  // Initialize with localStorage data synchronously
  const getInitialUserData = () => {
    try {
      const userDataStr = localStorage.getItem('userdata');
      return userDataStr ? JSON.parse(userDataStr) : null;
    } catch (err) {
      console.error("Error parsing user data from localStorage:", err);
      return null;
    }
  };

  const [userData, setUserData] = useState(getInitialUserData());
  const [dayPassExpiry, setDayPassExpiry] = useState("");
  const [dayPassMode, setDayPassMode] = useState("free");
  const [accountType, setAccountType] = useState(localStorage.getItem('userdata') ? JSON.parse(localStorage.getItem('userdata')).accountType : "free");
  const [subscriptionExpiry, setSubscriptionExpiry] = useState("");

  // Helper function to check if user has access to a given tier
  const hasAccessToTier = (requiredTier) => {
    const hierarchy = { 'free': 0, 'basic': 1, 'standard': 2, 'premium': 3 };
    return hierarchy[serviceMode] >= hierarchy[requiredTier];
  };

  // Fetch fresh user data on mount
  useEffect(() => {
    if (window.location.pathname === "/login" || window.location.pathname === "/register" || window.location.pathname === "/verify-account" || window.location.pathname === "/help" || window.location.pathname === "/info") {
      return; // Don't fetch user data on auth or public pages
    }

    localStorage.setItem('currentModeSelection', "free");
    const loadUserData = async () => {
      const freshUserData = await fetchUserData();
      if (freshUserData) {
        setUserData(freshUserData);
      }
    };

    console.log("App.jsx - Fetching userdata.accountType on mount:", accountType);


    loadUserData();

    // if (accountType === "free") {
    //   console.log("App.jsx - User is on free account");
    //   if (JSON.parse(localStorage.getItem('userdata')).accountType !== "free") {
    //     console.log("App.jsx - Detected account type change to free, reloading page...");
    //     window.location.reload();
    //   }
    // } else {
    //   console.log("App.jsx - User is on paid account");

    // }


    setTimeout(() => {
      updateUserAccess();
    }, 1000);


  }, []);

  const updateUserAccess = useCallback(() => {
    console.log("App.jsx - User Access:", userData);
    setDayPassExpiry(userData?.dayPassExpiry || "");
    setDayPassMode(userData?.dayPassMode || "free");
    // setAccountType(userData?.accountType || "free");
    setSubscriptionExpiry(userData?.planExpiry || "");
    setAccountType(userData?.accountType || "free");
  }, [userData]);

  // Update derived state when userData changes
  useEffect(() => {
    // console.log("App.jsx - User Data:", userData);
    setDayPassExpiry(userData?.dayPassExpiry || "");
    setDayPassMode(userData?.dayPassMode || "free");
    // setAccountType(userData?.accountType || "free");
    setSubscriptionExpiry(userData?.planExpiry || "");
    setAccountType(userData?.accountType || "free");
  }, [userData]);

  // add a auto logged out effect if token expired - runs every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const storedData = localStorage.getItem('userdata');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        const tokenExpiry = new Date(parsedData.tokenExpiry);
        const now = new Date();
        if (tokenExpiry < now) {
          // Token has expired, log out the user
          localStorage.removeItem('userdata');
          localStorage.removeItem('hashedPassword');
          setUserData(null);
          window.location.href = '/login'; // Redirect to login page
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <ToastProvider>
          <FingerprintProvider>
            <BrowserRouter>
              <TrackPageViews />
              <NavBar />
              <Routes>

                {/* Public Routes */}


                <Route path="/login" element={<Auth isLogin={true} />} />
                <Route path="/register" element={<Auth isLogin={false} />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                <Route path="/test-google-tts" element={<TestGoogleTTS />} />

                <Route path="/help" element={<HelpPage />} />
                <Route path="/info" element={<Info />} />

                <Route path="/verify-account" element={<VerifyAccount />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/password-reset" element={<VerifyAccount isPasswordReset={true} />} />


                {/* Purchase Credits Routes */}

                <>
                  <Route path="/purchase-crypto" element={<PurchaseCrypto />} />
                  <Route path="/purchase-stripe" element={<PurchaseStripe />} />
                  <Route path="/purchase-paypal" element={<PurchasePaypal />} />
                  <Route path="/purchase-cashapp" element={<PurchaseCashApp />} />
                  <Route path="/purchase-history" element={<PurchaseHistory />} />
                  <Route path="/account" element={<Account />} />
                </>

                {/* Main Route */}
                {/* not logged in */}
                {!(localStorage.getItem('userdata') ? JSON.parse(localStorage.getItem('userdata')).loginStatus : false) && (
                  <>
                    <Route path="/" element={<Info />} />
                  </>
                )}

                {/* logged in */}
                {(localStorage.getItem('userdata') ? JSON.parse(localStorage.getItem('userdata')).loginStatus : false) && (
                  <Route path="/" element={<Main />} />
                )}


                <Route path="/dashboard" element={<Main />} />

                <Route path="/wallet" element={<Wallet />} />

                <Route path="/plans" element={<Plans />} />

                <Route path="/subscribe" element={<Subscribe />} />

                <Route path="/subscribe-confirmation" element={<SubscribeConfirmation />} />

                <Route path="/stripe/success" element={
                  <ProtectedRoute> <StripeCheckoutForm /> </ProtectedRoute>} />

                <Route path="/stripe-checkout" element={
                  <ProtectedRoute> <StripeCheckoutForm /> </ProtectedRoute>} />

                {/* <Route path="/stripe-checkout" element={
                <ProtectedRoute> <StripeCheckoutForm credits={5000} amount={5000} currency="usd" description="Purchase of 5000 credits" metadata={{}} priceId="price_1J2Yw2L2g2g2g2" /> </ProtectedRoute>} /> */}
                <Route path="/return" element={
                  <ProtectedRoute> <Return /> </ProtectedRoute>} />

                {/* <Route path="/intro" element={<Intro />} /> */}

                {/* Video Editor */}

                {/* Free Services */}

                <>

                  <Route path="/photo-scrambler" element={<PhotoScrambler />} />
                  <Route path="/photo-unscrambler" element={<PhotoUnscrambler />} />
                  <Route path="/video-unscrambler" element={<VideoUnscrambler />} />
                  <Route path="/video-scrambler" element={<VideoScrambler />} />

                </>
                {/* ) : null} */}

                {/* Basic Services Rules */}
                {accountType === "basic" || accountType === "standard" || accountType === "premium" || ((dayPassMode === 'basic' || dayPassMode === 'standard' || dayPassMode === 'premium') && new Date(dayPassExpiry) > new Date()) ? (
                  <>
                    {/* Video Editor */}

                    <Route path="/video-scrambler-basic" element={<VideoScramblerBasic />} />

                    <Route path="/video-unscrambler-basic" element={<VideoUnscramblerBasic />} />
                    
                  </>
                ) : null}


                {/* Premium Services */}
                {accountType === 'premium' || (dayPassMode === 'premium' && new Date(dayPassExpiry) > new Date()) ? (
                  <>

                    <Route path="/video-scrambler-pro" element={<VideoScramblerPro />} />

                    <Route path="/video-unscrambler-pro" element={<VideoUnscramblerPro />} />


                  </>
                ) : null}

                <Route path="/audio-tagging" element={<AudioTagging />} />

                {/* Subscription Plans */}
                <Route path="/subscription/plans" element={<SubscriptionPlans />} />

                <Route path="/subscription/success" element={<SubscriptionSuccess />} />

                <Route path="/bonus-credits" element={<BonusCredits />} />

                <Route path="/stripe/success" element={<PurchaseStripeSuccessful />} />

                {/* need a redirect or fallback route if not logged in and the user tries to visit a protected route */}
                <Route path="*" element={<LoadingPage />} />


              </Routes>
            </BrowserRouter>
          </FingerprintProvider>
        </ToastProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
