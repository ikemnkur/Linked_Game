import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress } from '@mui/material';
import api from '../api/client';

const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001';

export default function VerifyEmail() {
    const location = useLocation();
    const navigate = useNavigate();

    // Get email and code from URL params (for link-based verification)
    const queryParams = new URLSearchParams(location.search);
    const emailFromUrl = queryParams.get('email') || '';
    const codeFromUrl = queryParams.get('code') || '';

    const [email, setEmail] = useState(emailFromUrl);
    const [verificationCode, setVerificationCode] = useState(codeFromUrl);
    const [statusMsg, setStatusMsg] = useState('');
    const [statusType, setStatusType] = useState(''); // 'success', 'error', 'info'
    const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutes
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);

    const timerCanvasRef = useRef(null);

    // Auto-verify if both email and code are in URL
    useEffect(() => {
        if (emailFromUrl && codeFromUrl && !isVerified) {
            handleVerify();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Pre-fill email from localStorage if available
    useEffect(() => {
        if (!email) {
            const userdata = localStorage.getItem('userdata');
            if (userdata) {
                try {
                    const userDataObj = JSON.parse(userdata);
                    if (userDataObj.email) {
                        setEmail(userDataObj.email);
                    }
                } catch (e) {
                    console.error('Error parsing userdata:', e);
                }
            }
        }
    }, [email]);

    // Countdown timer
    useEffect(() => {
        const id = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, []);

    // Draw timer canvas
    useEffect(() => {
        const canvas = timerCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const totalTime = 10 * 60;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 50;
        const percent = timeLeft / totalTime;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 8;
        ctx.stroke();

        // Progress arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * percent);
        ctx.strokeStyle = timeLeft < 60 ? '#dc3545' : '#00e676';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Timer text
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        ctx.fillText(`${mins}:${secs < 10 ? '0' : ''}${secs}`, centerX, centerY);
    }, [timeLeft]);

    // Show expired message
    useEffect(() => {
        if (timeLeft === 0 && !isVerified) {
            setStatusMsg('Verification code has expired. Please request a new one.');
            setStatusType('error');
        }
    }, [timeLeft, isVerified]);

    const handleVerify = async () => {
        if (!email) {
            setStatusMsg('Please enter your email address.');
            setStatusType('error');
            return;
        }

        if (!verificationCode) {
            setStatusMsg('Please enter the verification code.');
            setStatusType('error');
            return;
        }

        if (timeLeft === 0) {
            setStatusMsg('Verification code has expired. Please request a new one.');
            setStatusType('error');
            return;
        }

        setIsVerifying(true);
        setStatusMsg('Verifying...');
        setStatusType('info');

        try {
            const response = await api.post(`${API_URL}/api/auth/verify-email`, {
                email: email.trim(),
                code: verificationCode.trim(),
            });

            if (response.data.success) {
                setIsVerified(true);
                setStatusMsg('✅ Email verified successfully! Redirecting...');
                setStatusType('success');

                // Update local storage if user is logged in
                const userdata = localStorage.getItem('userdata');
                if (userdata) {
                    try {
                        const userDataObj = JSON.parse(userdata);
                        userDataObj.verification = 'true';
                        localStorage.setItem('userdata', JSON.stringify(userDataObj));
                    } catch (e) {
                        console.error('Error updating userdata:', e);
                    }
                }

                // Redirect after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setStatusMsg(response.data.message || 'Verification failed. Please try again.');
                setStatusType('error');
            }
        } catch (error) {
            console.error('Email verification error:', error);
            const errorMessage = error.response?.data?.message || 'Verification failed. Please try again.';
            setStatusMsg(errorMessage);
            setStatusType('error');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendCode = async () => {
        if (!email) {
            setStatusMsg('Please enter your email address first.');
            setStatusType('error');
            return;
        }

        setStatusMsg('Sending new verification code...');
        setStatusType('info');

        try {
            const response = await api.post(`${API_URL}/api/auth/resend-verification`, {
                email: email.trim(),
            });

            if (response.data.success) {
                setStatusMsg('✅ New verification code sent! Check your email.');
                setStatusType('success');
                setTimeLeft(10 * 60); // Reset timer
                setVerificationCode(''); // Clear old code
            } else {
                setStatusMsg(response.data.message || 'Failed to resend code.');
                setStatusType('error');
            }
        } catch (error) {
            console.error('Resend verification error:', error);
            const errorMessage = error.response?.data?.message || 'Failed to resend verification code.';
            setStatusMsg(errorMessage);
            setStatusType('error');
        }
    };

    const getStatusColor = () => {
        switch (statusType) {
            case 'success': return '#00e676';
            case 'error': return '#dc3545';
            case 'info': return '#ffd700';
            default: return '#ccc';
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                style={{
                    width: '100%',
                    maxWidth: 480,
                    margin: '0 16px',
                    padding: 30,
                    background: '#0f0f0f',
                    border: '1px solid #ffd700',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 25 }}>
                    <div style={{ fontSize: 48, marginBottom: 10 }}>📧</div>
                    <h2 style={{ color: '#ffd700', margin: 0, fontSize: 24 }}>Verify Your Email</h2>
                    <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>
                        Enter the 6-digit code sent to your email
                    </p>
                </div>

                {/* Info Button */}
                <div style={{ marginBottom: 20, textAlign: 'center' }}>
                    <button
                        onClick={() => setInfoOpen(true)}
                        style={{
                            background: 'transparent',
                            color: '#888',
                            border: 'none',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                        aria-label="Why is email verification required?"
                    >
                        Why is email verification required?
                    </button>
                </div>

                {/* Timer */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                    <canvas ref={timerCanvasRef} width={120} height={120} />
                </div>

                {/* Email Input */}
                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, color: '#fff', fontSize: 14 }}>
                        Email Address
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        disabled={isVerifying || isVerified}
                        style={{
                            width: '100%',
                            padding: 12,
                            borderRadius: 6,
                            border: '1px solid #333',
                            background: '#1a1a1a',
                            color: '#fff',
                            fontSize: 16,
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Verification Code Input */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, color: '#fff', fontSize: 14 }}>
                        Verification Code
                    </label>
                    <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                        placeholder="Enter 6-digit code"
                        maxLength={8}
                        disabled={isVerifying || isVerified}
                        style={{
                            width: '100%',
                            padding: 16,
                            borderRadius: 6,
                            border: '1px solid #333',
                            background: '#1a1a1a',
                            color: '#ffd700',
                            fontSize: 24,
                            textAlign: 'center',
                            letterSpacing: 8,
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Status Message */}
                <div
                    style={{
                        minHeight: 24,
                        marginBottom: 20,
                        textAlign: 'center',
                        fontSize: 14,
                        color: getStatusColor(),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}
                >
                    {isVerifying && <CircularProgress size={16} style={{ color: '#ffd700' }} />}
                    {statusMsg}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                        onClick={handleVerify}
                        disabled={isVerifying || isVerified || timeLeft === 0}
                        style={{
                            width: '100%',
                            padding: 14,
                            borderRadius: 6,
                            border: 'none',
                            background: isVerified ? '#00e676' : '#ffd700',
                            color: '#000',
                            fontSize: 16,
                            fontWeight: 'bold',
                            cursor: isVerifying || isVerified || timeLeft === 0 ? 'not-allowed' : 'pointer',
                            opacity: isVerifying || timeLeft === 0 ? 0.6 : 1,
                            transition: 'all 0.2s',
                        }}
                    >
                        {isVerified ? '✅ Verified!' : isVerifying ? 'Verifying...' : 'Verify Email'}
                    </button>

                    <button
                        onClick={handleResendCode}
                        disabled={isVerifying || isVerified}
                        style={{
                            width: '100%',
                            padding: 12,
                            borderRadius: 6,
                            border: '1px solid #333',
                            background: 'transparent',
                            color: '#888',
                            fontSize: 14,
                            cursor: isVerifying || isVerified ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        Didn't receive the code? Resend
                    </button>

                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            width: '100%',
                            padding: 12,
                            borderRadius: 6,
                            border: 'none',
                            background: 'transparent',
                            color: '#666',
                            fontSize: 13,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                    >
                        Back to Login
                    </button>
                </div>
            </div>

            {/* Info Dialog */}
            <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth>
                <div style={{ backgroundColor: '#0a0a0a' }}>
                    <DialogTitle style={{ color: '#ffd700' }}>Why verify your email?</DialogTitle>
                    <DialogContent>
                        <p style={{ marginTop: 8, color: '#ccc', lineHeight: 1.6 }}>
                            Email verification helps us ensure that:
                        </p>
                        <ul style={{ color: '#ccc', lineHeight: 1.8, paddingLeft: 20 }}>
                            <li>You own the email address you registered with</li>
                            <li>We can send you important account notifications</li>
                            <li>You can recover your account if you forget your password</li>
                            <li>Your account is protected from unauthorized access</li>
                        </ul>
                        <p style={{ color: '#888', fontSize: 13, marginTop: 16 }}>
                            The verification code expires in 10 minutes for security reasons.
                            If your code expires, you can request a new one.
                        </p>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setInfoOpen(false)} style={{ color: '#ffd700' }} autoFocus>
                            Got it
                        </Button>
                    </DialogActions>
                </div>
            </Dialog>
        </div>
    );
}
