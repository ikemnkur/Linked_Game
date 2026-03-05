import React, { useRef, useEffect } from 'react';

export default function CoinAnimationCanvas() {
  const canvasRef = useRef(null);
  const coinsRef = useRef([]);        // Holds the array of coin objects
  const spawnCooldownRef = useRef(0); // Counts frames between spawns

  const COIN_MAX = 10; // Maximum coins on screen
  const SPAWN_INTERVAL = 40; // Frames to wait before spawning a new coin
  const GRAVITY = 0.2; // Adjust as needed

  // Create a single coin with random initial properties
  function createCoin(canvasWidth) {
    return {
      x: Math.random() * canvasWidth,       // random horizontal spawn
      y: -50,                               // start above the top
      vx: (Math.random() - 0.5) * 2,        // slight horizontal drift
      vy: 2 + Math.random() * 3,            // initial vertical velocity
      rotation: 0,                          // spin angle in radians
      rotationSpeed: 0.05 + Math.random() * 0.1, // how fast it rotates
      bounceCount: 0,
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let animationFrameId;

    // The main animation loop
    function animate() {
      // Clear the canvas each frame
      ctx.clearRect(0, 0, width, height);

      // Increment spawn cooldown
      spawnCooldownRef.current += 1;
      // Check if it's time to spawn a new coin
      if (
        spawnCooldownRef.current >= SPAWN_INTERVAL &&
        coinsRef.current.length < COIN_MAX
      ) {
        coinsRef.current.push(createCoin(width));
        spawnCooldownRef.current = 0; // reset cooldown
      }

      // Update coin physics & position
      coinsRef.current = coinsRef.current.map((coin) => {
        coin.rotation += coin.rotationSpeed;
        coin.x += coin.vx;
        coin.y += coin.vy;
        coin.vy += GRAVITY;

        // Floor collision & bounce
        const floorY = height - 20; // radius is 20
        if (coin.y > floorY) {
          coin.y = floorY;
          coin.vy = -coin.vy * 0.6; // bounce up, lose some energy
          coin.bounceCount += 1;
        }

        // If coin has bounced enough times and slowed, or went above top, respawn
        if ((coin.bounceCount > 3 && Math.abs(coin.vy) < 0.3) || coin.y < -50) {
          return createCoin(width);
        }
        return coin;
      });

      // Draw the coins
      drawCoins(ctx, coinsRef.current, width);

      // Draw the foreground text
      drawForegroundText(ctx, width);

      // Request next frame
      animationFrameId = requestAnimationFrame(animate);
    }

    animate(); // Start the animation

    // Cleanup on component unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Draw the coins
  function drawCoins(ctx, coins) {
    coins.forEach((coin) => {
      ctx.save();
      // Translate to coin center
      ctx.translate(coin.x, coin.y);

      // Rotate around the coin's center in 2D
      ctx.rotate(coin.rotation);

      // Draw coin (circle)
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFD700';  // bright gold
      ctx.fill();

      // Outline
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#CDA100'; // darker gold outline
      ctx.stroke();

      // Letter K
      // Notice this text will spin with the coin
      ctx.fillStyle = '#8B6914'; // even darker hue for the K
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('K', 0, 0);

      ctx.restore();
    });
  }

  // Draw the “Welcome to Koin Klub” text
  function drawForegroundText(ctx, width) {
    ctx.save();
    ctx.font = '28px Impact, Arial, sans-serif';
    ctx.fillStyle = 'green';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('$ Linx $', width / 2, 10);
    ctx.restore();
  }

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={200}
      style={{
        display: 'block',
        backgroundColor: 'transparent',
        margin: '0 auto',
      }}
    />
  );
}
