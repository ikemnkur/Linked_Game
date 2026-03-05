// src/components/DotCaptcha.jsx
// require('dotenv').config();
import React, { useEffect, useState, useRef, useMemo } from 'react';
// import React, { useRef, useEffect, useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
// import { grey } from '@mui/material/colors';

const DotCaptcha = ({ onSuccess, onFailure }) => {
  const canvasRef = useRef(null);
  const [targetColor, setTargetColor] = useState('');
  const [targetCount, setTargetCount] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);

  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const colors = ['red', 'blue', 'green', 'yellow', 'purple'];
  const ballCount = 30;
  const balls = useRef([]);
  const animationFrameId = useRef(null);
  const timerId = useRef(null);

  const grey = '#b0b0b0';

  // Function to initialize balls
  function initializeBalls() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const newBalls = [];
    for (let i = 0; i < ballCount; i++) {
      const radius = 10;
      newBalls.push({
        x: Math.random() * (canvas.width - 2 * radius) + radius,
        y: Math.random() * (canvas.height - 2 * radius) + radius,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius,
      });
    }
    balls.current = newBalls;
  }

  // Function to animate balls
  function animate() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    balls.current.forEach((ball) => {
      // Move the ball
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Bounce off walls
      if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.vx = -ball.vx;
      }
      if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
        ball.vy = -ball.vy;
      }

      // Draw the ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color;
      ctx.fill();
      ctx.closePath();
    });

    animationFrameId.current = requestAnimationFrame(animate);
  }

  // Function to handle CAPTCHA failure
  function handleFailure() {
    setBlocked(true);
    if (onFailure) onFailure();
  }

  // Function to handle CAPTCHA timeout
  function handleTimeout() {
    setAttempts((prevAttempts) => {
      const newAttempts = prevAttempts + 1;
      if (newAttempts >= 3) {
        handleFailure();
      } else {
        // alert('Time is up. Please try again.');
        handleRefresh();
      }
      return newAttempts;
    });
  }

  // Function to start the timer
  function startTimer() {
    timerId.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev < 1) {
          clearInterval(timerId.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Function to refresh the CAPTCHA
  function handleRefresh() {
    // Clear existing timer
    clearInterval(timerId.current);
    initializeBalls();
    // Select new target color and count
    const target = colors[Math.floor(Math.random() * colors.length)];
    setTargetColor(target);
    const count = balls.current.filter((ball) => ball.color === target).length;
    setTargetCount(count);
    // Reset user input
    setUserInput('');
    // Reset timeLeft
    setTimeLeft(15);
    // Start timer again
    startTimer();
  }

  // useEffect to set up the CAPTCHA on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Set canvas dimensions
    canvas.width = 300;
    canvas.height = 200;

    // Initialize balls and select target color/count
    initializeBalls();
    const target = colors[Math.floor(Math.random() * colors.length)];
    setTargetColor(target);
    const count = balls.current.filter((ball) => ball.color === target).length;
    setTargetCount(count);

    // Start animation
    animate();

    // Start timer
    startTimer();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId.current);
      clearInterval(timerId.current);
    };
  }, []);

  // Function to handle form submission
  function handleSubmit(e) {
    e.preventDefault();
    if (parseInt(userInput, 10) === targetCount) {
      if (onSuccess) onSuccess();
      console.log('CAPTCHA passed');
    } else {
      setAttempts((prevAttempts) => {
        const newAttempts = prevAttempts + 1;
        if (newAttempts >= 4) {
          handleFailure();
        } else {
          alert('Incorrect count. Please try again.');
          handleRefresh();
        }
        return newAttempts;
      });
    }
  }

  if (blocked) {
    return (
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="error">
          You have been blocked due to multiple failed CAPTCHA attempts. Please try again later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }} style={{ padding: 7 }}  >
      <div style={{  padding: 5 }}>
        <Typography style={{  }} variant="h6" align="center">
          Count the number of <span style={{ color: targetColor, background: "lightgrey", padding: 5 , borderRadius: 5 }}>{targetColor}</span> dots:
        </Typography>
      </div>

      <canvas
        ref={canvasRef}
        style={{ border: '1px solid #ccc', display: 'block', margin: '20px auto' }}
      ></canvas>
      <Typography variant="body2" align="center">
        Time left: {timeLeft} seconds
      </Typography>
      <form onSubmit={handleSubmit} style={{ textAlign: 'center', marginTop: '10px' }}>
        <TextField
          label="Your Count"
          variant="outlined"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          required
          type="number"
          sx={{ width: '150px', marginRight: '10px' }}
        />
        <Button style={{ marginTop: "10px " }} onClick={handleSubmit} variant="contained" color="primary">
          Enter
        </Button>
      </form>
      <Button
        onClick={handleRefresh}
        variant="text"
        color="secondary"
        sx={{ display: 'block', margin: '10px auto' }}
      >
        Refresh CAPTCHA
      </Button>
    </Box>
  );
};

export default DotCaptcha;
