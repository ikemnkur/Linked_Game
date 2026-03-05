import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // Ensure you've installed this: npm install jwt-decode

import {
    Typography,
    Button,
    Paper,
    Box,
    TextField,
    Avatar,
    Grid,
    Snackbar,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Chip,
    CircularProgress,
} from '@mui/material';

const AutoLogoutHandler = () => {
    const navigate = useNavigate();
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [countdown, setCountdown] = useState(120); // 60 seconds countdown

    const onStayLoggedIn = () => {
        // Close the modal and reset timers when user chooses to stay logged in
        setIsModalOpen(false);
        setCountdown(120); // Reset countdown
        
        const token = localStorage.getItem('token');
        if (!token) {
            onLogout();
            return;
        }

        try {
            const decodedToken = jwtDecode(token);
            const currentTime = Date.now() / 1000;

            if (decodedToken.exp < currentTime) {
                // Token has expired, log out
                onLogout();
                return;
            }

            // Show success message for staying logged in
            setSnackbarMessage("Session extended successfully!");
            setOpenSnackbar(true);
            setTimeout(() => {
                setOpenSnackbar(false);
            }, 2000);

        } catch (error) {
            console.error('Error decoding token:', error);
            onLogout();
            return;
        }

        // Optionally, you can refresh the token here by making an API call to your backend
        // and updating the token in localStorage.

    }

    // function onLogout(){
    const onLogout = () => {
        // display logout message and redirect to login page after 1 second
        // alert("You have been logged out due to inactivity.");
        setSnackbarMessage("You have been logged out due to inactivity.");
        setOpenSnackbar(true);
        setTimeout(() => {
            setOpenSnackbar(false);
            // clear token and redirect to login
            localStorage.removeItem('token');
            localStorage.setItem('reloaded_', 'false');
            navigate('/login');
        }, 1000);
    }


    // Modal component for auto logout


    const AutoLogoutModal = ({ isOpen, onStayLoggedIn, onLogout }) => {
        useEffect(() => {
            if (!isOpen) return;

            const timer = setInterval(() => {
                setCountdown((prevCountdown) => {
                    if (prevCountdown <= 1) {
                        clearInterval(timer);
                        onLogout();
                        return 0;
                    }
                    return prevCountdown - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }, [isOpen, onLogout]);

        return (
            <Dialog
                open={isOpen}
                onClose={() => {}} // Prevent closing by clicking outside
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        backgroundColor: '#1a1a1a',
                        border: '2px solid #ffd700',
                        borderRadius: '12px',
                        boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)',
                    }
                }}
            >
                <DialogTitle 
                    sx={{ 
                        color: '#ffd700', 
                        textAlign: 'center',
                        textShadow: '0 0 10px rgba(255, 215, 0, 0.5)' 
                    }}
                >
                    Session Expiring Soon
                </DialogTitle>
                <DialogContent>
                    <DialogContentText 
                        sx={{ 
                            color: '#ffffff', 
                            textAlign: 'center', 
                            mb: 2 
                        }}
                    >
                        You have been inactive for a while. Your session will expire automatically.
                    </DialogContentText>
                    <Box 
                        sx={{ 
                            textAlign: 'center', 
                            color: '#ff6b6b', 
                            fontSize: '18px', 
                            fontWeight: 'bold',
                            mb: 2 
                        }}
                    >
                        Auto logout in {countdown} seconds
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
                    <Button
                        onClick={onStayLoggedIn}
                        sx={{
                            backgroundColor: '#ffd700',
                            color: '#000000',
                            border: '1px solid #ffd700',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            mr: 2,
                            '&:hover': {
                                backgroundColor: '#ffed4e',
                                boxShadow: '0 0 15px rgba(255, 215, 0, 0.6)',
                            }
                        }}
                    >
                        Stay Logged In
                    </Button>
                    <Button
                        onClick={onLogout}
                        sx={{
                            backgroundColor: 'transparent',
                            color: '#ff6b6b',
                            border: '1px solid #ff6b6b',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                                boxShadow: '0 0 15px rgba(255, 107, 107, 0.3)',
                            }
                        }}
                    >
                        Log Out
                    </Button>
                </DialogActions>
            </Dialog>
        );
    };

    // Example file from the same project for reference:
    // Handler for successful CAPTCHA
    // const handleCaptchaSuccess = useCallback(async () => {
    //     setCaptchaPassed(true);
    //     setCaptchaFailed(false);

    //     // Proceed to submit the authentication request after CAPTCHA is passed
    //     try {
    //         const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    //         const payload = isLogin
    //             ? { email, password }
    //             : { username, email, password, name, country, city, birthday };

    //         const link = `${API_URL}${endpoint}`;
    //         console.log('link: ' + link);

    //         const response = await axios.post(link, payload);

    //         localStorage.setItem('token', response.data.token);
    //         localStorage.setItem('userdata', JSON.stringify(response.data.user));
    //         // Optionally, clear failed CAPTCHA attempts on success
    //         localStorage.removeItem('failedCaptcha');

    //         if (onLoginSuccess) {
    //             onLoginSuccess();
    //         } else {
    //             navigate('/dashboard');
    //         }
    //     } catch (error) {
    //         console.error('Auth error:', error.response?.data?.message || 'An error occurred');
    //         alert(error.response?.data?.message || 'An error occurred during authentication.');
    //         // Reset CAPTCHA state to allow the user to try again
    //         setCaptchaPassed(false);
    //         setShowCaptcha(false);
    //     }
    // }, [API_URL, email, password, username, isLogin, navigate, onLoginSuccess]);



    function sequence1() {
        setSnackbarMessage("Your session has expired. Please choose to stay logged in or you will be logged out automatically.");
        setOpenSnackbar(true);

        // Show the modal to confirm if the user wants to stay logged in
        setIsModalOpen(true);
        setCountdown(120); // Reset countdown to 2 minutes

        setTimeout(() => {
            setOpenSnackbar(false);
        }, 3000);

        // If no action is taken within 2 minutes, auto logout
        setTimeout(() => {
            if (isModalOpen) { // Only logout if modal is still open
                localStorage.removeItem('token');
                localStorage.removeItem('userdata');
                navigate('/login');
            }
        }, 120000); // 2 minutes instead of 120 seconds
    }




    // every 10 minutes do this
    useEffect(() => {
        const interval = setInterval(() => {
            // Add any periodic checks or refresh logic here
            const token = localStorage.getItem('token');
            
            if (!token) {
                clearInterval(interval);
                return;
            }
            
            try {
                const decodedToken = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                if (decodedToken.exp < currentTime) {
                    clearInterval(interval);
                    sequence1();
                }
            } catch (error) {
                console.error('Error decoding token in interval:', error);
                clearInterval(interval);
                onLogout();
            }
        }, 600000); // 10 minutes in milliseconds

        return () => clearInterval(interval);
    }, []);



    // auto logout after 1 hour of inactivity and user agrees to it
    useEffect(() => {

        const token = localStorage.getItem('token');
        if (!token) {
            setSnackbarMessage("No token found, redirecting to login.");
            setOpenSnackbar(true);
            setTimeout(() => {
                setOpenSnackbar(false);
                // clear token and redirect to login
                localStorage.removeItem('token');
                navigate('/login');
            }, 1000);
            return; // Add return to prevent further execution
        }

        try {
            const decodedToken = jwtDecode(token);
            const currentTime = Date.now() / 1000;

            if (decodedToken.exp < currentTime) {
                sequence1();
            }
        } catch (error) {
            console.error('Error decoding token:', error);
            localStorage.removeItem('token');
            navigate('/login');
        }

        // //pull from localstorage
        // let logoutTimer = localStorage.getItem('logoutTimer') || null;

        // const resetLogoutTimer = () => {
        //     if (logoutTimer) clearTimeout(logoutTimer);
        //     logoutTimer = setTimeout(() => {
        //         if (window.confirm("You have been inactive for 1 hour. Do you want to stay logged in?")) {
        //             resetLogoutTimer();
        //         } else {
        //             localStorage.removeItem('token');
        //             navigate('/login');
        //         }
        //     }, 3600000); // 1 hour in milliseconds
        // };

        // window.addEventListener('mousemove', resetLogoutTimer);
        // window.addEventListener('keydown', resetLogoutTimer);

        // resetLogoutTimer();

        // return () => {
        //     if (logoutTimer) clearTimeout(logoutTimer);
        //     window.removeEventListener('mousemove', resetLogoutTimer);
        //     window.removeEventListener('keydown', resetLogoutTimer);
        // };
    }, [navigate]);


    return (
        <>
            {/* Todo create ui to handle the auto logout process, the UI will prompt the user to stay logged in or log out and be included in every component on the app */}
            {/* Create a modal or notification component for the auto logout warning */}
            {/* Implement the modal or notification component here */}
            {/* Example: */}
            {/* Snackbar */}
            <Snackbar
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                message={snackbarMessage}
            />
            <AutoLogoutModal
                isOpen={isModalOpen}
                onStayLoggedIn={onStayLoggedIn}
                onLogout={onLogout}
            />
        </>
    );
};

export default AutoLogoutHandler;