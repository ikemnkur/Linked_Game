import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Button, Stack, Typography, IconButton } from '@mui/material';
import { Refresh as RefreshIcon, CheckCircle as VerifyIcon } from '@mui/icons-material';

// Simpler mobile-friendly CAPTCHA: "Click all X-colored dots" with animated bouncing balls
export default function SimpleDotCaptcha({ maxDots = 8, onPass, onFail, timeLimit = 30 }) {
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink'];
    const canvasRef = useRef(null);
    const animationFrameId = useRef(null);
    const timerId = useRef(null);
    const balls = useRef([]);
    
    const [targetColor, setTargetColor] = useState('');
    const [targetCount, setTargetCount] = useState(0);
    const [selectedBalls, setSelectedBalls] = useState(new Set());
    const [timeLeft, setTimeLeft] = useState(timeLimit);
    const [isActive, setIsActive] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    // Canvas dimensions
    const canvasWidth = 400;
    const canvasHeight = 250;
    const ballRadius = 20;

    const correctSelected = useMemo(() => {
        return Array.from(selectedBalls).filter(ballId => {
            const ball = balls.current.find(b => b.id === ballId);
            return ball && ball.color === targetColor;
        }).length;
    }, [selectedBalls, targetColor]);

    // Initialize balls with random positions and velocities
    const initializeBalls = () => {
        const count = Math.max(5, Math.floor(Math.random() * maxDots) + 1);
        balls.current = Array.from({ length: count }).map((_, i) => ({
            id: i + 1,
            x: Math.random() * (canvasWidth - ballRadius * 2) + ballRadius,
            y: Math.random() * (canvasHeight - ballRadius * 2) + ballRadius,
            vx: (Math.random() - 0.5) * 2, // Random velocity between -2 and 2
            vy: (Math.random() - 0.5) * 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            radius: ballRadius,
            selected: false
        }));
    };

    // Animation loop
    const animate = () => {
        const canvas = canvasRef.current;
        if (!canvas || gameOver) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw background
        ctx.fillStyle = '#0f0f0f';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        balls.current.forEach((ball) => {
            // Update position
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Bounce off walls
            if (ball.x + ball.radius > canvasWidth || ball.x - ball.radius < 0) {
                ball.vx = -ball.vx;
                ball.x = Math.max(ball.radius, Math.min(canvasWidth - ball.radius, ball.x));
            }
            if (ball.y + ball.radius > canvasHeight || ball.y - ball.radius < 0) {
                ball.vy = -ball.vy;
                ball.y = Math.max(ball.radius, Math.min(canvasHeight - ball.radius, ball.y));
            }

            // Draw ball
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = ball.color;
            ctx.fill();
            
            // Draw selection outline
            if (selectedBalls.has(ball.id)) {
                ctx.strokeStyle = '#00e676';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            
            ctx.closePath();
        });

        animationFrameId.current = requestAnimationFrame(animate);
    };

    // Handle canvas click
    const handleCanvasClick = (event) => {
        if (gameOver || !isActive) return;
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const clickX = (event.clientX - rect.left) * scaleX;
        const clickY = (event.clientY - rect.top) * scaleY;

        // Check if click is on any ball
        for (const ball of balls.current) {
            const distance = Math.sqrt((clickX - ball.x) ** 2 + (clickY - ball.y) ** 2);
            if (distance <= ball.radius) {
                const newSelected = new Set(selectedBalls);
                if (newSelected.has(ball.id)) {
                    newSelected.delete(ball.id);
                } else {
                    newSelected.add(ball.id);
                }
                setSelectedBalls(newSelected);
                break;
            }
        }
    };

    // Start timer
    const startTimer = () => {
        timerId.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerId.current);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Handle timeout
    const handleTimeout = () => {
        setAttempts(prev => {
            const newAttempts = prev + 1;
            if (newAttempts >= 3) {
                setGameOver(true);
                onFail && onFail();
            } else {
                handleRefresh();
            }
            return newAttempts;
        });
    };

    // Refresh CAPTCHA
    const handleRefresh = () => {
        clearInterval(timerId.current);
        setSelectedBalls(new Set());
        setTimeLeft(timeLimit);
        initializeBalls();
        
        // Select new target color
        const availableColors = [...new Set(balls.current.map(b => b.color))];
        const newTarget = availableColors[Math.floor(Math.random() * availableColors.length)];
        setTargetColor(newTarget);
        setTargetCount(balls.current.filter(b => b.color === newTarget).length);
        
        setIsActive(true);
        startTimer();
    };

    // Verify selection
    const handleVerify = () => {
        const correctBalls = balls.current.filter(b => b.color === targetColor);
        const selectedCorrectly = Array.from(selectedBalls).every(ballId => {
            const ball = balls.current.find(b => b.id === ballId);
            return ball && ball.color === targetColor;
        });
        
        const allTargetsSelected = correctBalls.every(ball => selectedBalls.has(ball.id));
        const noExtraSelected = selectedBalls.size === correctBalls.length;
        
        if (selectedCorrectly && allTargetsSelected && noExtraSelected) {
            clearInterval(timerId.current);
            setGameOver(true);
            setIsActive(false);
            onPass && onPass();
        } else {
            handleTimeout(); // Treat as failure
        }
    };

    // Initialize on mount
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        initializeBalls();
        
        // Select target color
        const availableColors = [...new Set(balls.current.map(b => b.color))];
        const target = availableColors[Math.floor(Math.random() * availableColors.length)];
        setTargetColor(target);
        setTargetCount(balls.current.filter(b => b.color === target).length);
        
        setIsActive(true);
        startTimer();
        animate();

        return () => {
            clearInterval(timerId.current);
            cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    if (gameOver && attempts >= 3) {
        return (
            <Stack spacing={2} alignItems="center">
                <Typography variant="h6" color="error">
                    CAPTCHA Failed
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Too many failed attempts. Please try again later.
                </Typography>
            </Stack>
        );
    }

    return (
        <Stack spacing={2} alignItems="center">
            <Typography variant="body1" textAlign="center">
                Click all <b style={{ color: targetColor, textTransform: 'uppercase' }}>{targetColor}</b> dots
                ({targetCount} remaining)
            </Typography>
            
            {/* Timer */}
            <Typography 
                variant="body2" 
                color={timeLeft <= 10 ? 'error' : 'text.secondary'}
                sx={{ fontWeight: 'bold' }}
            >
                Time: {timeLeft}s
            </Typography>

            {/* Canvas */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%'
                }}
            >
                <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    style={{
                        border: '2px solid #444',
                        borderRadius: '8px',
                        cursor: isActive ? 'pointer' : 'not-allowed',
                        maxWidth: '100%',
                        height: 'auto'
                    }}
                />
            </Box>

            {/* Control Buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: '100%' }}>
                <IconButton
                    onClick={handleRefresh}
                    disabled={gameOver}
                    sx={{
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' },
                        '&:disabled': { bgcolor: 'grey.500' }
                    }}
                >
                    <RefreshIcon />
                </IconButton>
                
                <Button
                    onClick={handleVerify}
                    disabled={gameOver || !isActive || selectedBalls.size === 0}
                    variant="contained"
                    color="success"
                    startIcon={<VerifyIcon />}
                    sx={{ minWidth: 120 }}
                >
                    Verify
                </Button>
            </Box>

            {/* Progress indicator */}
            <Typography variant="caption" color="text.secondary">
                Selected: {correctSelected}/{targetCount} correct
                {selectedBalls.size > correctSelected && 
                    ` (+${selectedBalls.size - correctSelected} incorrect)`
                }
            </Typography>
        </Stack>
    );
}