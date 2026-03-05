import React, { useEffect, useState } from 'react';
import {
  Button,
  Container,
  Stack,
  Typography,
  Card,
  CardContent,
  Divider,
  Skeleton,
  Box,
  Grid,
  Paper
} from '@mui/material';
import {
  CreditCard,
  AccountBalanceWallet,
  CurrencyBitcoin,
  Payment,
  Star,
  Timer,
  AttachMoney
} from '@mui/icons-material';
// import Button from '../components/Button';
import api from '../api/client';
import { useToast } from '../contexts/ToastContext';


import { useNavigate } from 'react-router-dom';


export default function Wallet() {
  const [balance, setBalance] = useState(null);
  const { success, error } = useToast();

  const [timeLeft, setTimeLeft] = useState(75); // 75 seconds timer for ad watch
  const [quizUnlocked, setQuizUnlocked] = useState(false);
  const [hasWatchedAd, setHasWatchedAd] = useState(false);

  useEffect(() => {
    if (timeLeft === 0) {
      setQuizUnlocked(true);
      setHasWatchedAd(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem("userdata")));

  const navigate = useNavigate();


  const load = async () => {
    try {
      const { data } = await api.post(`/api/wallet/balance/${userData.username}`, { Password: userData.password, email: userData.email });
      setBalance(data?.balance ?? 0);
    } catch (e) {
      console.error(e);
      setBalance(100); // demo fallback
    }
  };

  useEffect(() => { load(); }, []);

  const onPaymentError = () => error('Payment could not be started');

  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Star sx={{ fontSize: 40 }} />
            Earn Bonus Credits
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Watch ads and answer quiz questions to earn free credits!
          </Typography>
        </Box>

        <Card variant="outlined" elevation={4}>
          <CardContent sx={{ p: 4 }}>
            {/* Current Balance Display */}
            <Box sx={{ mb: 4, textAlign: 'center', p: 3, backgroundColor: 'primary.light', borderRadius: 2 }}>
              <Typography variant="h6" color="text.secondary">Your Current Balance</Typography>
              {balance === null ? (
                <Skeleton variant="text" width={220} height={54} sx={{ mx: 'auto' }} />
              ) : (
                <Typography variant="h2" sx={{ fontWeight: 800, color: '#7c6a04ff' }}>
                  {balance} credits
                </Typography>
              )}
            </Box>


            <Divider sx={{ my: 3 }} />

            {/* One-time Purchases Section */}
            <Box>
              <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer color="secondary" />
                Watch a short ad to earn bonus credits
              </Typography>

              <Box sx={{ mb: 4 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Watch the ad below for 60 seconds or more and complete the quiz to earn bonus credits in your wallet!
                </Typography>
                
                {/* Ad Timer & Video Player */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: timeLeft > 0 ? 'warning.main' : 'success.main', fontWeight: 'bold' }}>
                    {timeLeft > 0 ? `⏱️ Time Remaining: ${timeLeft} seconds` : '✅ Ad Complete! Quiz Unlocked'}
                  </Typography>

                  <Paper elevation={3} sx={{ p: 2, backgroundColor: '#000', borderRadius: 2 }}>
                    <video 
                      controls 
                      autoPlay
                      style={{ width: '100%', maxHeight: '400px', borderRadius: '8px' }}
                      onEnded={() => {
                        if (timeLeft <= 0) {
                          success('Ad watched! Quiz unlocked - answer correctly to earn credits.');
                        }
                      }}
                    >
                      <source src="/ads/sample-ad.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </Paper>

                  {timeLeft > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                      ⚠️ You must watch the ad for at least 60 seconds to unlock the quiz
                    </Typography>
                  )}
                </Box>
              </Box>

             
              <Divider sx={{ my: 3 }} />
            </Box>

            {/* Quiz Section */}
            <Box>
              <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Star color="secondary" />
                Quiz: Answer correctly to earn 200 bonus credits
              </Typography>

              {timeLeft > 0 ? (
                <Paper sx={{ p: 3, backgroundColor: '#f5f5f5', textAlign: 'center' }}>
                  <Typography variant="body1" color="black">
                    🔒 Quiz locked. Please watch the ad above to unlock.
                  </Typography>
                </Paper>
              ) : (
                <form>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Paper elevation={2} sx={{ p: 3, border: '2px solid', borderColor: 'primary.light', backgroundColor: '#292929ff' }}>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                          What is the main product being advertised in the video?
                        </Typography>
                        
                        <Stack spacing={1.5}>
                          <Paper 
                            sx={{ 
                              p: 2, 
                              cursor: 'pointer', 
                              transition: 'all 0.2s',
                              backgroundColor: '#4e4e4eff',
                              '&:hover': { backgroundColor: '#000000', transform: 'translateX(4px)' }
                            }}
                          >
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="radio" name="quiz" value="A" style={{ cursor: 'pointer' }} />
                              <Typography>A) Linx App</Typography>
                            </label>
                          </Paper>

                          <Paper 
                            sx={{ 
                              p: 2, 
                              cursor: 'pointer', 
                              transition: 'all 0.2s',
                              backgroundColor: '#4e4e4eff',
                              '&:hover': { backgroundColor: '#000000', transform: 'translateX(4px)' }
                            }}
                          >
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="radio" name="quiz" value="B" style={{ cursor: 'pointer' }} />
                              <Typography>B) Audio Editing Software</Typography>
                            </label>
                          </Paper>

                          <Paper 
                            sx={{ 
                              p: 2, 
                              cursor: 'pointer', 
                              transition: 'all 0.2s',
                              backgroundColor: '#4e4e4eff',
                              '&:hover': { backgroundColor: '#000000', transform: 'translateX(4px)' }
                            }}
                          >
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="radio" name="quiz" value="C" style={{ cursor: 'pointer' }} />
                              <Typography>C) Online Streaming Service</Typography>
                            </label>
                          </Paper>

                          <Paper 
                            sx={{ 
                              p: 2, 
                              cursor: 'pointer', 
                              transition: 'all 0.2s',
                              backgroundColor: '#4e4e4eff',
                              '&:hover': { backgroundColor: '#000000', transform: 'translateX(4px)' }
                            }}
                          >
                            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input type="radio" name="quiz" value="D" style={{ cursor: 'pointer' }} />
                              <Typography>D) Mobile Game</Typography>
                            </label>
                          </Paper>
                        </Stack>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    startIcon={<Star />}
                    sx={{ mt: 3, py: 1.5, fontSize: '1.1rem' }}
                    onClick={async (e) => {
                      e.preventDefault();
                      const selected = document.querySelector('input[name="quiz"]:checked');
                      
                      if (!selected) {
                        error('Please select an answer before submitting.');
                        return;
                      }

                      if (selected.value === 'A') {
                        try {
                          // Placeholder API call - will be connected to backend later
                          await api.post('/api/bonus-credits/award', {
                            username: userData.username,
                            amount: 200,
                            reason: 'Bonus credits for correct quiz answer',
                            adId: 'sample-ad-001',
                            timestamp: new Date().toISOString()
                          });
                          
                          success('🎉 Correct! 200 bonus credits added to your wallet.');
                          
                          // Reset quiz for next round
                          setTimeLeft(75);
                          setQuizUnlocked(false);
                          setHasWatchedAd(false);
                          const radios = document.querySelectorAll('input[name="quiz"]');
                          radios.forEach(radio => radio.checked = false);
                          load(); // Refresh balance
                        } catch (err) {
                          console.error('Bonus credit award error:', err);
                          error('Failed to add bonus credits. Please try again later.');
                        }
                      } else {
                        error('❌ Incorrect answer. Please try again or watch the ad more carefully.');
                      }
                    }}
                  >
                    Submit Answer & Claim Credits
                  </Button>
                </form>
              )}
            </Box>

          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}