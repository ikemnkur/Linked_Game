// Move these components to the top level of your file or into separate files
import { v4 as uuidv4 } from 'uuid';
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
// import { stripePromise } from './path-to-stripe-promise'; // Ensure you import your stripePromise correctly
import { fetchUserProfile, walletStripeReloadAction } from "../api/api";
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import Notifications from './Notifications';


const stripePromise = loadStripe('pk_test_51OPgiOEViYxfJNd2ZA0pYlZ3MKdsIHDEhE9vzihdcj6CUW99q7ULSgR44nWfNVwhKvEHJ1JQCaf1NcXGhTROu8Dh008XrwD0Hv');

export const StripeCheckoutForm = ({ credits, amount, currency, description, metadata, priceId, onSuccess }) => {
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    // const amount = query.get('amount');
    const [clientSecret, setClientSecret] = useState(null);
    // const [coins, setLocalCoins] = useState(0);
    const [coins, setCredits ] = useState(0);

    useEffect(() => {
        const createCheckoutSession = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001'; // = process.env.REACT_APP_API_SERVER_URL || 'http://localhost:3001';
                const response = await fetch(`${API_URL}/create-checkout-session`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        priceId: priceId || null,
                        amount,
                        currency: currency || 'usd',
                        description: description || `${amount * 1000} Credits Purchase`,
                        metadata: metadata || {}
                    }),
                });

                const data = await response.json();
                console.log("Create checkout session response:", data);

                if (!response.ok) {
                    console.error("Create checkout session failed:", data);
                    return;
                }

                // The backend returns { url: session.url, sessionId: session.id }
                if (data.url) {
                    // mark clientSecret so component doesn't stay stuck on "Loading..."
                    setClientSecret('redirecting');
                    // Redirect the browser to Stripe Checkout (hosted page)
                    window.location.href = data.url;
                } else {
                    console.error("No checkout URL returned from server:", data);
                }
            } catch (err) {
                console.error("Error creating checkout session:", err);
            }
        };

        createCheckoutSession();
    }, [amount, priceId, currency, description, metadata]);

    useEffect(() => {
        setCredits(parseInt(credits));
        console.log("Credits set to:", credits);
        console.log("amount:", amount);
        console.log("price ID:", priceId);
    }, [credits, setCredits]);

    if (!clientSecret) {
        return <div>Loading...</div>;
    }



    return (
        <div id="checkout">
            <div style={{ margin: "auto", padding: "auto", textAlign: "center" }}>
                <h1>You are buying: {(amount * 1000).toLocaleString()} Coins.</h1>
            </div>
            <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret }}
            >
                <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
        </div>
    );
};


export const Return = () => {
    const [status, setStatus] = useState(null);
    const [TRXdata, setTRXdata] = useState(null);
    const [customerEmail, setCustomerEmail] = useState('');
    const [done, setDone] = useState(false);
    // const [userdata, setUserData] = useState([]);
    const navigate = useNavigate();
    const [amnt, setAmnt] = useState(0);
    const [userData, setUserData] = useState(() => {
        const storedData = localStorage.getItem("userdata");
        return storedData ? JSON.parse(storedData) : {};
    });



    const increaseCoins = useCallback(async (coin) => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        const sessionId = urlParams.get('session_id');
        if (TRXdata)
            try {
                const profile = await fetchUserProfile();
                const updatedUserData = {
                    ...profile,
                    birthDate: profile.birthDate ? profile.birthDate.split('T')[0] : '',
                };

                setUserData(updatedUserData);
                localStorage.setItem("userdata", JSON.stringify(updatedUserData));

                const d = new Date();
                console.log('Adding ', coin, ' coins to your wallet');
                console.log("At time: " + d);
                console.log("TRX: ", TRXdata)

                const walletActionData = {
                    username: updatedUserData.username,
                    amount: parseInt(coin),
                    date: d.getTime(),
                    stripe: uuidv4(),
                    session_id: sessionId,
                    TRXdata: TRXdata

                };

                const result = await walletStripeReloadAction(walletActionData);
                console.log("Coins purchased successfully!", result);

                // Update the local state with the new coin balance
                setUserData(prevData => ({
                    ...prevData,
                    coins: (prevData.coins || 0) + parseInt(coin)
                }));
            } catch (error) {
                console.log(error.message || "Failed to reload wallet. Please try again later.");
                if (error.response?.status === 401) {
                    // Unauthorized, token might be expired
                    setTimeout(() => window.location.href = '/wallet', 250);
                }
            }
    }, [TRXdata]);

    console.log("Stripe page - user data: ", ud);

    // Move setUserData inside useEffect
    useEffect(() => {
        setUserData(ud);
    }, [ud]);

    const createNotification = async (notificationData) => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001'; // = process.env.REACT_APP_API_SERVER_URL + "/api" || 'http://localhost:5000/api';
            await axios.post(`${API_URL}/notifications/create`, notificationData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log("New notification: ", notificationData.message);
        } catch (error) {
            console.error('Error creating notification');
        }
    };

    // Retrive data from Session ID
    // useEffect(() => {
    //     const queryString = window.location.search;
    //     const urlParams = new URLSearchParams(queryString);
    //     const sessionId = urlParams.get('session_id');
    //     const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001'; // = process.env.REACT_APP_API_SERVER_URL || 'http://localhost:5000';

    //     fetch(`${API_URL}/session-status?session_id=${sessionId}`)
    //         .then((res) => res.json())
    //         .then((data) => {
    //             setTRXdata(data);
    //             console.log("Data: ", data)
    //             setStatus(data.status);
    //             setCustomerEmail(data.customer_email);
    //         });
    // }, []);

    useEffect(() => {
        const fetchSessionStatus = async () => {
            try {
                // Extract sessionId from URL
                const queryString = window.location.search;
                const urlParams = new URLSearchParams(queryString);
                const sessionId = urlParams.get('session_id');

                // Bail out early if no sessionId
                if (!sessionId) {
                    console.warn('No session_id found in URL');
                    return;
                }

                // Build your API URL
                const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001'; // = process.env.REACT_APP_API_SERVER_URL || 'http://localhost:5000/api';

                // Fetch session status
                const response = await fetch(`${API_URL}/session-status?session_id=${sessionId}`);
                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }

                // Parse JSON data
                const data = await response.json();
                console.log('Session status data:', data);

                // ------------------------- NEW LINES HERE -------------------------
                // Log the paymentIntent portion for debugging, then set your TRXdata
                console.log("Payment Intent Data:", data.paymentIntent);
                setTRXdata(data.paymentIntent);
                // ------------------------------------------------------------------

                // Keep storing other pieces of data, if you need them
                setStatus(data.status);
                setCustomerEmail(data.customer_email);

            } catch (error) {
                console.error('Failed to fetch session status:', error);
                // Optionally, set some error state here if desired
            }
        };

        fetchSessionStatus();
    }, []);

    useEffect(() => {
        console.log("Updated TRXdata: ", TRXdata);
    }, [TRXdata]);


    // Add coins to account
    useEffect(() => {
        if (status === 'complete' && !done) {
            const amount = parseInt(new URLSearchParams(window.location.search).get('amount')) || 0;
            setAmnt(amount); // Use setAmnt instead of direct assignment
            increaseCoins(amount * 1000);
            setDone(true);
            console.log(status);
        } else if (status === 'open') {
            navigate('/stripe-checkout');
        }
    }, [status, done, increaseCoins, navigate]);

    useEffect(() => {
        if (status === 'complete') {
            if (amnt != 0)
                createNotification({
                    type: 'coin purchase',
                    recipient_user_id: userdata.user_id,
                    recipient_username: userdata.username,
                    message: `From: Bot - You bought ₡${amnt*1000} coins via Stripe.`,
                    from: "Admin",
                    date: new Date()
                });

            const errorTimeout = setTimeout(() => {
                // Handle server error or duplicate request
                // You might want to set some error state here instead of returning JSX
                console.error("Server Error. Same Request.");
            }, 5000);

            const navigateTimeout = setTimeout(() => {
                navigate('/dashboard');
            }, 10000);

            return () => {
                clearTimeout(errorTimeout);
                clearTimeout(navigateTimeout);
            };
        }
    }, [status, amnt, userdata, navigate]);

    if (status === 'complete') {
        return (
            <section id="success">
                <h2>
                    Make you you have sent the make and wait for its confirmation in your notifications.
                </h2>
                <p>
                    We appreciate your business! A confirmation email may also be sent to {customerEmail}.
                </p>
                <p>
                    If you have any questions, please email <a href="mailto:orders@example.com">orders@example.com</a>.
                </p>
                <p>
                    This page will be redirected in a few seconds. Click here to go <a href="/dashboard"> Dashboard </a>.
                </p>
            </section>
        );
    }

    return <div>Processing...</div>;
};


export default StripeCheckoutForm;