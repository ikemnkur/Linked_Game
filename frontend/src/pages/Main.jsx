import React, { useEffect, useState } from 'react';
import { Container, Stack, Typography, Card, CardContent, Divider, Skeleton, Button, Modal, Box, IconButton } from '@mui/material';
import { Close, Lock, Star } from '@mui/icons-material';
import PaymentButton from '../components/PaymentButton';
import Notifications from '../components/Notifications.jsx';
import api from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Password } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001';


export default function MainPage() {
    const [balance, setBalance] = useState(null);
    const [dayPassExpiry, setDayPassExpiry] = useState(null);
    const [dayPassMode, setDayPassMode] = useState('free');
    const [accountType, setAccountType] = useState("free"); //  'free', bassic, standard, premium
    const { success, info, error } = useToast();

    const userData = JSON.parse(localStorage.getItem("userdata"));
    const [serviceMode, setServiceMode] = useState(localStorage.getItem('currentModeSelection') || 'free');
    const [showModeModal, setShowModeModal] = useState(false);
    const [selectedMode, setSelectedMode] = useState(null);
    // const [currentMode, setCurrentMode] = useState(null);


    const navigate = useNavigate();

    const modeCredits = {
        basic: 100,
        standard: 200,
        premium: 400
    };

    // Helper function to check if user has access to a given tier
    const hasAccessToTier = (requiredTier) => {
        const hierarchy = { 'free': 0, 'basic': 1, 'standard': 2, 'premium': 3 };
        let access = hierarchy[serviceMode] >= hierarchy[requiredTier] || hierarchy[accountType] >= hierarchy[requiredTier];
        return access;
    };

    const load = async () => {

        try {
            // Direct API call to JSON Server
            // let response;

            // fetch data if no data fetched before or last fetch was over 1.5 minutes ago
            // let lastDataFetchTooOld = !localStorage.getItem('lastDataFetch') ||
            //     (Date.now() - parseInt(localStorage.getItem('lastDataFetch') || "0", 10) > 1.5 * 60 * 1000);


            let response = await api.post(`/api/user`, {
                username: userData.username,
                email: userData.email,
                password: "Password"//localStorage.getItem('hashedPassword')
            });

            // if (response.status === 200 && response.data) {
            console.log("API user response:", response);
            response.ok && console.log("API user response OK");
            if (response.data && response.data.success) {
                console.log("User profile response data:", response.data);
                // localStorage.setItem('Earnings', JSON.stringify(response.data.earnings || []));
                // localStorage.setItem('Unlocks', JSON.stringify(response.data.unlocks || []));
                localStorage.setItem('userdata', JSON.stringify(response.data.user || {}));
                localStorage.setItem('lastDataFetch', Date.now().toString()); // Set account type

                // Store dayPass data properly (don't store null as string)
                if (response.data.dayPassExpiry) {
                    localStorage.setItem('dayPassExpiry', response.data.dayPassExpiry);
                } else {
                    localStorage.removeItem('dayPassExpiry');
                }

                if (response.data.dayPassMode && new Date(response.data.dayPassExpiry) > new Date()) {
                    localStorage.setItem('dayPassMode', response.data.dayPassMode);
                } else {
                    localStorage.setItem('dayPassMode', 'free');
                }

                setDayPassExpiry(response.data.dayPassExpiry || null);
                setDayPassMode(response.data.dayPassMode || 'free');
                setBalance(response.data.user.credits || 0); // Use credits from userData or fallback
                setAccountType(response.data.user.accountType || 'free');
            } else {
                throw new Error('Failed to fetch wallet data');
            }

        } catch (e) {
            console.error('Error loading wallet balance:', e);
            setBalance(750); // demo fallback with realistic amount
            // clear local storage
            localStorage.clear();
            navigate('/info');
            setTimeout(() => { navigate('/login'); }, 15000); // Redirect to login after 15 seconds
        }

    };

    useEffect(() => { load(); }, []);

    const onPaymentError = () => error('Payment could not be started');

    const handleModeChange = (mode) => {

        // setCurrentMode(mode);
        localStorage.setItem('currentModeSelection', mode);

        // console.log("handleModeChange called with mode:", mode);
        // console.log("Current dayPassExpiry:", dayPassExpiry);
        // console.log("Current dayPassMode:", dayPassMode);
        // console.log("dayPassExpiry type:", typeof dayPassExpiry);
        // console.log("Is expiry valid?", dayPassExpiry && new Date(dayPassExpiry) > new Date());
        console.log("Service Mode:", serviceMode);


        // Define mode hierarchy for comparison
        const modeHierarchy = { 'free': 0, 'basic': 1, 'standard': 2, 'premium': 3 };
        const hasActivePass = dayPassExpiry && new Date(dayPassExpiry) > new Date();

        if (mode === 'free') {
            setServiceMode('free');
            return;
        }



        // if user has a active plan (not a 24 pass but a full month 30day plan) Override the dayPass
        if (accountType && accountType !== 'free') {
            const currentLevel = modeHierarchy[accountType] || 0;
            const selectedLevel = modeHierarchy[mode] || 0;

            // If trying to use lower tier services
            if (selectedLevel <= currentLevel) {

                setServiceMode(mode)
                // return;
            } else {
                setShowModeModal(true)
            }

            // setServiceMode(accountType);
            // return;
        }

        // If user has an active pass
        if (hasActivePass) {
            const currentLevel = modeHierarchy[dayPassMode] || 0;
            const selectedLevel = modeHierarchy[mode] || 0;

            // If trying to select same mode they already have
            if (mode === dayPassMode) {
                info(`You have an active ${mode} pass until it expires at ${new Date(dayPassExpiry).toLocaleString()}.`);
                setServiceMode(dayPassMode);
                return;
            }

            // / If trying to use lower tier services
            if (selectedLevel < currentLevel) {
                // error(`Cannot downgrade from ${dayPassMode} to ${mode}. Your current pass is still active.`);
                setServiceMode(mode)
                return;
            }

            // Allow upgrade to higher tier
            console.log(`Allowing upgrade from ${dayPassMode} to ${mode}`);
        }

        // Open modal for purchase/upgrade
        setSelectedMode(mode);
        setShowModeModal(true);
    };

    const handlePurchasePass = async () => {
        const cost = modeCredits[selectedMode];
        const modeHierarchy = { 'free': 0, 'basic': 1, 'standard': 2, 'premium': 3 };
        const hasActivePass = dayPassExpiry && new Date(dayPassExpiry) > new Date();
        const isUpgrade = hasActivePass && modeHierarchy[selectedMode] > modeHierarchy[dayPassMode];

        if (balance < cost) {
            error(`Insufficient credits. You need ${cost} credits but only have ${balance}.`);
            setShowModeModal(false);
            return;
        }

        try {
            // Placeholder API call - will be connected to backend later
            const response = await api.post('/api/purchase-mode-pass', {
                username: userData.username,
                mode: selectedMode,
                cost: cost,
                timestamp: new Date().toISOString()
            });

            if (response.data.success) {
                setBalance(balance - cost);
                setServiceMode(selectedMode);
                setDayPassMode(selectedMode);
                setDayPassExpiry(new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString());
                localStorage.setItem('dayPassMode', selectedMode);
                localStorage.setItem('dayPassExpiry', new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString());
                setShowModeModal(false);

                const actionText = isUpgrade ? 'upgraded to' : 'activated';
                success(`🎉 ${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} pass ${actionText}! ${cost} credits deducted.`);
            }
        } catch (err) {
            console.error('Mode pass purchase error:', err);
            error('Failed to purchase mode pass. Please try again.');
        }
    };

    return (
        <Container sx={{ py: 4, backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
            <Stack spacing={2}>
                {/* <Typography variant="h4" sx={{ color: '#ffd700', fontWeight: 700 }}>Main</Typography> */}
                <Card variant="outlined" sx={{
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #ffd700',
                    borderRadius: 2
                }}>
                    <CardContent>
                        {/* <Typography variant="h4" sx={{ color: '#ffd700' }}>Current Balance</Typography> */}
                        {balance === null ? (
                            <Skeleton variant="text" width={220} height={54} animation="wave" />
                        ) : (
                            <Typography variant="h3" sx={{ fontWeight: 800, color: '#2e7d32' }}>{balance} credits</Typography>
                        )}

                        <Typography variant="h4" sx={{ color: '#f7e244ff', mt: 1 }}>
                            Plan: {accountType.charAt(0).toUpperCase() + accountType.slice(1)} {dayPassMode !== "free" && new Date(dayPassExpiry) > new Date() && `|| 24h Pass: ${dayPassMode.charAt(0).toUpperCase() + dayPassMode.slice(1)}`}
                        </Typography>

                        {/* </CardContent> */}

                        {/* purchase button : go to purchase page */}

                        {/* <CardContent> */}
                        <Divider sx={{ my: 2, borderColor: '#444' }} />
                        {/* {accountType === 'buyer' && ( */}
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '10px' }}>
                            <Button
                                onClick={() => navigate("/wallet")}
                                variant="outlined"
                                sx={{
                                    borderColor: '#2e7d32',
                                    color: '#2e7d32',
                                    '&:hover': {
                                        backgroundColor: '#2e7d32',
                                        color: '#fff'
                                    }
                                }}
                            >
                                Get More Credits
                            </Button>
                            <Button
                                onClick={() => navigate("/plans")}
                                variant="outlined"
                                sx={{
                                    borderColor: '#2e7d32',
                                    color: '#2e7d32',
                                    '&:hover': {
                                        backgroundColor: '#2e7d32',
                                        color: '#fff'
                                    }
                                }}
                            >
                                Change Plan
                            </Button>
                            <Button
                                onClick={() => navigate("/purchase-history")}
                                variant="outlined"
                                sx={{
                                    borderColor: '#2e7d32',
                                    color: '#2e7d32',
                                    '&:hover': {
                                        backgroundColor: '#2e7d32',
                                        color: '#fff'
                                    }
                                }}
                            >
                                Purchase History
                            </Button>
                        </div>


                    </CardContent>
                </Card>



                <Card variant="outlined" sx={{
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #ffd700',
                    borderRadius: 2
                }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ color: '#ffd700', mb: 3 }}>What do you want to do?</Typography>

                        {/* create buttons for modes for services: free, basic, standard, premium */}
                        <div style={{ display: 'flex', gap: '16px', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: '#ccc', alignSelf: 'center' }}>Mode:</Typography>
                            <Button
                                variant={serviceMode === 'free' ? 'contained' : 'outlined'}
                                sx={{
                                    color: serviceMode === 'free' ? '#0a0a0a' : '#ffd700',
                                    borderColor: '#ffd700',
                                    backgroundColor: serviceMode === 'free' ? '#ffd700' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: serviceMode === 'free' ? '#e6c200' : 'rgba(255, 215, 0, 0.1)'
                                    }
                                }}
                                onClick={() => handleModeChange('free')}>
                                Lite
                            </Button>
                            <Button
                                variant={serviceMode === 'basic' ? 'contained' : 'outlined'}
                                sx={{
                                    color: serviceMode === 'basic' ? '#0a0a0a' : '#ffd700',
                                    borderColor: '#ffd700',
                                    backgroundColor: serviceMode === 'basic' ? '#ffd700' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: serviceMode === 'basic' ? '#e6c200' : 'rgba(255, 215, 0, 0.1)'
                                    }
                                }}
                                onClick={() => handleModeChange('basic')}>
                                Basic
                            </Button>
                            <Button
                                variant={serviceMode === 'standard' ? 'contained' : 'outlined'}
                                sx={{
                                    color: serviceMode === 'standard' ? '#0a0a0a' : '#ffd700',
                                    borderColor: '#ffd700',
                                    backgroundColor: serviceMode === 'standard' ? '#ffd700' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: serviceMode === 'standard' ? '#e6c200' : 'rgba(255, 215, 0, 0.1)'
                                    }
                                }}
                                onClick={() => handleModeChange('standard')}>
                                Standard
                            </Button>
                            <Button
                                variant={serviceMode === 'premium' ? 'contained' : 'outlined'}
                                sx={{
                                    color: serviceMode === 'premium' ? '#0a0a0a' : '#ffd700',
                                    borderColor: '#ffd700',
                                    backgroundColor: serviceMode === 'premium' ? '#ffd700' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: serviceMode === 'premium' ? '#e6c200' : 'rgba(255, 215, 0, 0.1)'
                                    }
                                }}
                                onClick={() => handleModeChange('premium')}>
                                Premium
                            </Button>
                        </div>

                        <Divider sx={{ my: 2, borderColor: '#444' }} />

                        {/* Services Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '16px'
                        }}>

                            {/*------------------------- Free Services-------------------------- */}

                            {/* Free Scramble Photo Service */}
                            {(hasAccessToTier('free') && serviceMode === 'free') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #2e7d32',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#2e7d327a',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/photo-scrambler")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#2e7d32ff', mb: 1, fontWeight: 'bold' }}>
                                            🔐📸 Scramble Photo Lite
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Protect your images by scrambling them with watermarks and metadata headers for secure sharing.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Free Unscramble Photo Service */}
                            {(hasAccessToTier('free') && serviceMode === 'free') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #ff9800',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#ff990050',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/photo-unscrambler")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#ff9800', mb: 1, fontWeight: 'bold' }}>
                                            🖼️ Unscramble Photo Lite
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Restore scrambled images using unscramble keys. View protected photos in their original form.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}



                            {(hasAccessToTier('free') && serviceMode === 'free') && (
                                <Divider sx={{ my: 0, borderColor: '#444', gridColumn: '1 / -1' }} />
                            )}




                            {/* Free Scramble Video Service */}
                            {(hasAccessToTier('free') && serviceMode === 'free') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #2e7d32',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#2e7d3263',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/video-scrambler")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#2e7d32', mb: 1, fontWeight: 'bold' }}>
                                            🔐🎬 Scramble Video Lite
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Upload and scramble videos into unrecognizable tiles. Generate keys to monetize access to your content. Fast Processing.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Free Unscramble Video Service */}
                            {(hasAccessToTier('free') && serviceMode === 'free') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #ff9800',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#ff990057',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/video-unscrambler")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#ff9900ff', mb: 1, fontWeight: 'bold' }}>
                                            🎬 Unscramble Video Lite
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Use your keys to unscramble videos back to their original form. Restore scrambled content. Fast Processing.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}


                            {/*------------------------- Basic Services-------------------------- */}

                            {/* basic Scramble Video Service */}
                            {(hasAccessToTier('basic') && serviceMode === 'basic') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #2e7d32',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#2e7d3263',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/video-scrambler-basic")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#2e7d32', mb: 1, fontWeight: 'bold' }}>
                                            🔐🎬 Scramble Video
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Upload and scramble videos into unrecognizable tiles. Generate keys to monetize access to your content. Slower but Higher Quality output.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* basic Unscramble Video Service */}
                            {(hasAccessToTier('basic') && serviceMode === 'basic') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #ff9800',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#ff990057',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/video-unscrambler-basic")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#ff9900ff', mb: 1, fontWeight: 'bold' }}>
                                            🎬 Unscramble Video
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Use your keys to unscramble videos back to their original form. Restore scrambled content. Slower but Higher Quality output.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {(hasAccessToTier('basic') && serviceMode === 'basic') && (
                                <Divider sx={{ my: 0, borderColor: '#444', gridColumn: '1 / -1' }} />
                            )}

                            {/* basic Scramble Photo Service */}
                            {(hasAccessToTier('basic') && serviceMode === 'basic') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #2e7d32',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#2e7d327a',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/photo-scrambler-basic")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#2e7d32ff', mb: 1, fontWeight: 'bold' }}>
                                            🔐📸 Scramble Photo
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Protect your images by scrambling them with watermarks and metadata headers for secure sharing.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* basic Unscramble Photo Service */}
                            {(hasAccessToTier('basic') && serviceMode === 'basic') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #ff9800',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#ff990050',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/photo-unscrambler-basic")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#ff9800', mb: 1, fontWeight: 'bold' }}>
                                            🖼️ Unscramble Photo
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Restore scrambled images using unscramble keys. View protected photos in their original form.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {(hasAccessToTier('basic') && serviceMode === 'basic') && (
                                <Divider sx={{ my: 0, borderColor: '#444', gridColumn: '1 / -1' }} />
                            )}

                            {/* Basic  Service: Scramble Audio Service */}
                            {(hasAccessToTier('basic') && serviceMode === 'basic') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #2e7d32',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#2e7d3253',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/audio-scrambler")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#2e7d32ff', mb: 1, fontWeight: 'bold' }}>
                                            🔐🎵 Scramble Audio {serviceMode === 'free' ? '' : '    (No Ads)'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Protect your audio/music by scrambling them with reversible noise for secure sharing.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Basic Unscramble Audio Service */}
                            {(hasAccessToTier('basic') && serviceMode === 'basic') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #ff9800',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#ff99002b',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/audio-unscrambler")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#ff9800', mb: 1, fontWeight: 'bold' }}>
                                            🎵 Unscramble Audio {serviceMode === 'free' ? '' : '    (No Ads)'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Unlock newly released audio/music by unscrambling them with special algorithms.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/*------------------------- standard Services-------------------------- */}

                            {/*  Scramble Photo Service */}
                            {hasAccessToTier('standard') && serviceMode === 'standard' && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #2e7d32',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#2e7d323a',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/photo-scrambler-pro")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#2e7d32ff', mb: 1, fontWeight: 'bold' }}>
                                            🔐📸 Scramble Photo {serviceMode === 'premium' ? '(FHD)' : '(HD)'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Protect your images by scrambling them with watermarks and metadata headers for secure sharing.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}


                            {/* Pro Unscramble Photo Service */}
                            {hasAccessToTier('standard') && serviceMode === 'standard' && (

                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #ff9800',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#ff990056',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/photo-unscrambler-pro")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#ff9800', mb: 1, fontWeight: 'bold' }}>
                                            🖼️ Unscramble Photo {serviceMode === 'premium' ? '(FHD)' : '(HD)'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Restore scrambled images using unscramble keys. View protected photos in their original form.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {(hasAccessToTier('standard') && serviceMode === 'standard') && (
                                <Divider sx={{ my: 0, borderColor: '#444', gridColumn: '1 / -1' }} />
                            )}


                            {/* Pro Scramble Video Service */}
                            {hasAccessToTier('standard') && serviceMode === 'standard' && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #2e7d32',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#2e7d3275',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/video-scrambler-standard")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#2e7d32', mb: 1, fontWeight: 'bold' }}>
                                            🔐🎬 Scramble Video {serviceMode === 'premium' ? '(FHD)' : '(HD)'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Upload and scramble videos into unrecognizable tiles. Generate keys to monetize access to your content.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Standard Unscramble Video Service */}
                            {hasAccessToTier('standard') && serviceMode === 'standard' && (

                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #ff9800',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#ff99004d',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/video-unscrambler-standard")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#ff9800', mb: 1, fontWeight: 'bold' }}>
                                            🎬 Unscramble Video {serviceMode === 'premium' ? '(FHD)' : '(HD)'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Restore scrambled videos using unscramble keys. View protected content in its original form.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {(hasAccessToTier('standard') && serviceMode === 'standard') && (
                                <Divider sx={{ my: 0, borderColor: '#444', gridColumn: '1 / -1' }} />
                            )}

                            {/* Basic  Service: Scramble Audio Service */}
                            {(hasAccessToTier('standard') && serviceMode === 'standard') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #2e7d32',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#2e7d3253',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/audio-scrambler-pro")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#2e7d32ff', mb: 1, fontWeight: 'bold' }}>
                                            🔐🎵 Scramble Audio+
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Protect your audio/music by scrambling them with reversible noise for secure sharing.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Basic Unscramble Audio Service */}
                            {(hasAccessToTier('standard') && serviceMode === 'standard') && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #ff9800',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#ff99002b',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/audio-unscrambler-pro")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#ff9800', mb: 1, fontWeight: 'bold' }}>
                                            🎵 Unscramble Audio+
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Unlock newly released audio/music by unscrambling them with special algorithms.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}


                            {/*---------------------- Premium Services -------------------------------*/}


                            {/*  Scramble Photo Service */}
                            {/* {hasAccessToTier('premium') && serviceMode === 'premium' && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #2e7d32',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#2e7d323a',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/photo-scrambler-pro")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#2e7d32ff', mb: 1, fontWeight: 'bold' }}>
                                            🔐📸 Scramble Photo {serviceMode === 'premium' ? '(FHD)' : '(HD)'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Protect your images by scrambling them with watermarks and metadata headers for secure sharing.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )} */}

                            {/*  Scramble Photo Service */}
                            {/* {hasAccessToTier('premium') && serviceMode === 'premium' && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #2e7d32',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#2e7d323a',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/photo-unscrambler-pro")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#2e7d32ff', mb: 1, fontWeight: 'bold' }}>
                                            🔐📸 Unscramble Photo (FHD)
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Protect your images by scrambling them with watermarks and metadata headers for secure sharing.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )} */}

                            {/* {hasAccessToTier('premium') && serviceMode === 'premium' && <Divider sx={{ my: 0, borderColor: '#444', gridColumn: '1 / -1' }} />} */}


                            {hasAccessToTier('premium') && serviceMode === 'premium' && <Divider sx={{ my: 0, borderColor: '#444', gridColumn: '1 / -1' }} />}

                            {/* Pro Scramble Video Service */}
                            {hasAccessToTier('premium') && serviceMode === 'premium' && (

                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #ff9800',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#ff99004d',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/video-scrambler-pro")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#ff9800', mb: 1, fontWeight: 'bold' }}>
                                            🎬 Scramble Video (FHD)
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Restore scrambled videos using unscramble keys. View protected content in its original form.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Pro Unscramble Video Service */}
                            {hasAccessToTier('premium') && serviceMode === 'premium' && (

                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #ff9800',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#ff99004d',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/video-unscrambler-pro")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#ff9800', mb: 1, fontWeight: 'bold' }}>
                                            🎬 Unscramble Video (FHD)
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Restore scrambled videos using unscramble keys. View protected content in its original form.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {serviceMode === 'premium' && <Divider sx={{ my: 0, borderColor: '#444', gridColumn: '1 / -1' }} />}


                            {/* Audio Leak Checker Service */}
                            {hasAccessToTier('premium') && serviceMode === 'premium' && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #e91e63',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#e91e625d',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(233, 30, 99, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/audio-leak-checker")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#e91e63', mb: 1, fontWeight: 'bold' }}>
                                            🔍🔊 Audio Leak Scanner
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Scan and detect if your audios have been leaked or shared without permission online.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Photo Leak Checker Service */}
                            {hasAccessToTier('premium') && serviceMode === 'premium' && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #e91e63',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#e91e6250',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(233, 30, 99, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/photo-leak-checker")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#e91e63', mb: 1, fontWeight: 'bold' }}>
                                            🔍🖼️  Photo Leak Scanner
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Scan and detect if your images have been leaked or shared without permission online.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Video Leak Checker Service */}
                            {hasAccessToTier('premium') && serviceMode === 'premium' && (
                                <Card sx={{
                                    backgroundColor: '#2a2a2a',
                                    border: '1px solid #e91e63',
                                    borderRadius: 2,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: '#e91e6249',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(233, 30, 99, 0.3)'
                                    }
                                }}
                                    onClick={() => navigate("/video-leak-checker")}>
                                    <CardContent sx={{ p: 2 }}>
                                        <Typography variant="h6" sx={{ color: '#e91e63', mb: 1, fontWeight: 'bold' }}>
                                            🔍🎥 Video Leak Scanner
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#ccc', lineHeight: 1.4 }}>
                                            Monitor and check if your videos have been leaked or distributed without authorization.
                                        </Typography>
                                    </CardContent>
                                </Card>
                            )}


                        </div>
                    </CardContent>
                </Card>


                <Card variant="outlined" sx={{
                    backgroundColor: '#1a1a1a',
                    border: '2px solid #ffd700',
                    borderRadius: 2
                }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ color: '#ffd700' }}>Notifications</Typography>
                        <Notifications />
                    </CardContent>
                </Card>
            </Stack>

            {/* Mode Purchase Modal */}
            <Modal open={showModeModal && (() => {
                if (!selectedMode) return false;

                const modeHierarchy = { 'free': 0, 'basic': 1, 'standard': 2, 'premium': 3 };
                const selectedLevel = modeHierarchy[selectedMode] || 0;
                const accountLevel = modeHierarchy[accountType] || 0;
                const hasActivePass = dayPassExpiry && new Date(dayPassExpiry) > new Date();
                const dayPassLevel = modeHierarchy[dayPassMode] || 0;

                // If user already has access via their account plan, don't show modal
                if (accountLevel >= selectedLevel) return false;

                // If user has an active day pass that covers the selected mode, don't show modal
                if (hasActivePass && dayPassLevel >= selectedLevel) return false;

                // Otherwise, show modal to purchase day pass
                return true;
            })()} onClose={() => setShowModeModal(false)}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: { xs: '90vw', sm: '500px' },
                    bgcolor: '#1a1a1a',
                    border: '3px solid #ffd700',
                    borderRadius: 3,
                    boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)',
                    p: 4
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h5" sx={{ color: '#ffd700', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Lock /> Unlock {selectedMode && selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Mode
                        </Typography>
                        <IconButton onClick={() => setShowModeModal(false)} sx={{ color: '#ffd700' }}>
                            <Close />
                        </IconButton>
                    </Box>

                    <Divider sx={{ mb: 3, borderColor: '#444' }} />

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body1" sx={{ color: '#ccc', mb: 2 }}>
                            To access <strong style={{ color: '#ffd700' }}>{selectedMode}</strong> mode features, you need to purchase a pass.
                        </Typography>

                        <Card sx={{ backgroundColor: '#2a2a2a', border: '2px solid #2e7d32', p: 2, mb: 2 }}>
                            <Typography variant="h6" sx={{ color: '#2e7d32', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Star /> Mode Benefits:
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                                • {selectedMode === 'basic' && 'Ad-free experience + Audio scrambling'}
                                {selectedMode === 'standard' && 'Pro HD video/photo scrambling + Audio in Videos'}
                                {selectedMode === 'premium' && 'FHD quality + Leak detection scanners'}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                                • Priority processing and faster exports
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#ccc' }}>
                                • Access to advanced scrambling algorithms
                            </Typography>
                        </Card>

                        <Box sx={{ backgroundColor: '#2a2a2a', border: '2px solid #ffd700', p: 2, borderRadius: 2, textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: '#ffd700', fontWeight: 'bold' }}>
                                {selectedMode && modeCredits[selectedMode]} Credits
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#999', mt: 0.5 }}>
                                One-time pass purchase
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ mb: 2, p: 2, backgroundColor: '#2a2a2a', borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ color: '#ccc' }}>
                            Your Balance: <strong style={{ color: balance >= (selectedMode && modeCredits[selectedMode]) ? '#2e7d32' : '#f44336' }}>
                                {balance} credits
                            </strong>
                        </Typography>
                        {balance < (selectedMode && modeCredits[selectedMode]) && (
                            <Typography variant="body2" sx={{ color: '#f44336', mt: 1 }}>
                                ⚠️ Insufficient credits. You need {selectedMode && (modeCredits[selectedMode] - balance)} more credits.
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => setShowModeModal(false)}
                            sx={{
                                borderColor: '#666',
                                color: '#ccc',
                                '&:hover': {
                                    borderColor: '#ffd700',
                                    backgroundColor: 'rgba(255, 215, 0, 0.1)'
                                }
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handlePurchasePass}
                            disabled={balance < (selectedMode && modeCredits[selectedMode])}
                            sx={{
                                backgroundColor: balance >= (selectedMode && modeCredits[selectedMode]) ? '#ffd700' : '#666',
                                color: '#0a0a0a',
                                fontWeight: 'bold',
                                '&:hover': {
                                    backgroundColor: balance >= (selectedMode && modeCredits[selectedMode]) ? '#e6c200' : '#666'
                                },
                                '&:disabled': {
                                    backgroundColor: '#444',
                                    color: '#666'
                                }
                            }}
                        >
                            {balance >= (selectedMode && modeCredits[selectedMode]) ? 'Purchase Pass' : 'Get More Credits'}
                        </Button>
                    </Box>

                    {balance < (selectedMode && modeCredits[selectedMode]) && (
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => {
                                setShowModeModal(false);
                                navigate('/wallet');
                            }}
                            sx={{
                                mt: 2,
                                borderColor: '#2e7d32',
                                color: '#2e7d32',
                                '&:hover': {
                                    backgroundColor: '#2e7d32',
                                    color: '#fff'
                                }
                            }}
                        >
                            Go to Wallet & Buy Credits
                        </Button>
                    )}
                </Box>
            </Modal>
        </Container >
    );
}