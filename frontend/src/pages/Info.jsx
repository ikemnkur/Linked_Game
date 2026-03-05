import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Paper,
  Box,
  CircularProgress,
  Snackbar,
  Button,
  Modal,
  TextField,
  Select,
  MenuItem,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";


const Info = () => {
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001';

  // Component state
  const [InfoData, setInfoData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [userData, setUserData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    birthDate: "",
    encryptionKey: "",
    accountTier: 1,
    profilePicture: null,
  });
  const [tier, setTier] = useState(true);

  // New state for modal and FAQ search
  const [openPopupAdModal, setOpenPopupAdModal] = useState(false);
  const [popupAdContent, setPopupAdContent] = useState(null);
  const [openSupportModal, setOpenSupportModal] = useState(false);
  const [supportUsername, setSupportUsername] = useState("");
  const [supportProblemType, setSupportProblemType] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportTitle, setSupportTitle] = useState("");
  const [supportContactInfo, setSupportContactInfo] = useState("");
  const [faqSearch, setFaqSearch] = useState("");

  // Fly game state
  const [flies, setFlies] = useState([]);
  const [deadFlies, setDeadFlies] = useState([]); // Separate array for dead flies
  const [fliesKilled, setFliesKilled] = useState(0);
  const [totalFlies, setTotalFlies] = useState(0); // Track total flies spawned
  const [swatterPos, setSwatterPos] = useState({ x: 0, y: 0, rotation: 0 });
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickPos, setLastClickPos] = useState({ x: 0, y: 0 });
  
  // Refs for game loop data (to avoid stale closures)
  const deadFliesRef = useRef([]);
  const killedFlyIdsRef = useRef(new Set()); // Track IDs of killed flies
  
  // Ref for seeking to timestamps in videos
  const howToVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const gameAnimationRef = useRef(null);
  const flyImages = useRef([]);
  const swatterImage = useRef(null);
  const splatterImage = useRef(null);
  const bgAdImage = useRef(null);

  // Load info data
  useEffect(() => {
    const loadInfoData = async () => {
      try {
        // Placeholder: const data = await fetchInfoData();
        // setInfoData(data);
        if (window.location.href.includes("info")) {
          // do nothing
        } else {
          let loggedIn = localStorage.getItem("userdata")
            ? JSON.parse(localStorage.getItem("userdata")).loginStatus
            : false;
          if (loggedIn) window.location.reload(true);
        }
      } catch (err) {
        setTimeout(() => navigate("/login"), 500);
        setError("Failed to load data, Please Re-Login");
      } finally {
        setIsLoading(false);
      }
    };
    loadInfoData();
  }, [navigate]);

  // Handle video seek (placeholder)
  const handleSeekTo = (seconds) => {
    if (howToVideoRef.current) {
      console.log(`Seeking to ${seconds} seconds (placeholder)`);
    }
  };

  // Modal open/close
  const handleOpenSupportModal = () => setOpenSupportModal(true);
  const handleCloseSupportModal = () => setOpenSupportModal(false);
  const handleOpenPopupAdModal = () => setOpenPopupAdModal(true);
  const handleClosePopupAdModal = () => setOpenPopupAdModal(false);

  // Handle canvas mouse/touch move for swatter
  const handleCanvasMove = (e) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.type.startsWith('touch')) {
      clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX;
      clientY = e.touches[0]?.clientY || e.changedTouches[0]?.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    // Calculate rotation based on movement direction
    const dx = x - swatterPos.x;
    const dy = y - swatterPos.y;
    const rotation = Math.atan2(dy, dx) + Math.PI / 4;
    
    setSwatterPos({ x, y, rotation });
  };

  // Handle canvas click for fly swatting
  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.type.startsWith('touch')) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    const distanceFromLastClick = Math.sqrt(
      Math.pow(x - lastClickPos.x, 2) + Math.pow(y - lastClickPos.y, 2)
    );
    
    // Double-click detection (within 500ms and 50px)
    const isDoubleClick = timeSinceLastClick < 500 && distanceFromLastClick < 50;
    
    if (isDoubleClick) {
      // Check if clicked on a fly (larger hitbox)
      setFlies(prevFlies => {
        let flyWasKilled = false;
        const remainingFlies = [];
        
        for (const fly of prevFlies) {
          // Skip if this fly was already killed
          if (killedFlyIdsRef.current.has(fly.id)) {
            continue;
          }
          
          const distance = Math.sqrt(Math.pow(x - fly.x, 2) + Math.pow(y - fly.y, 2));
          if (distance < 35 && !flyWasKilled) {
            // Mark this fly as killed in the ref (for the animation loop)
            killedFlyIdsRef.current.add(fly.id);
            
            // Kill this fly - add to dead flies array
            const deadFly = {
              x: fly.x,
              y: fly.y,
              opacity: 1,
              killedAt: Date.now(),
              id: fly.id // Use the same ID
            };
            setDeadFlies(prev => {
              const newDeadFlies = [...prev, deadFly];
              deadFliesRef.current = newDeadFlies;
              return newDeadFlies;
            });
            setFliesKilled(prev => prev + 1);
            flyWasKilled = true;
            // Don't add this fly to remainingFlies (remove it)
          } else {
            remainingFlies.push(fly);
          }
        }
        
        return remainingFlies;
      });
    }
    
    setLastClickTime(now);
    setLastClickPos({ x, y });
    
    // On mobile, animate swatter to click position
    if (e.type.startsWith('touch')) {
      const dx = x - swatterPos.x;
      const dy = y - swatterPos.y;
      const rotation = Math.atan2(dy, dx) + Math.PI / 4;
      
      // Smooth transition will be handled by the state update
      setSwatterPos({ x, y, rotation });
    }
  };

  // Display popup ad modal using useEffect
  useEffect(() => {
    const openTimer = setTimeout(() => {
      handleOpenPopupAdModal();
    }, 10000);

    return () => {
      clearTimeout(openTimer);
    };
  }, []);

  // Initialize fly game when modal opens
  useEffect(() => {
    if (!openPopupAdModal) return;

    // Small delay to ensure canvas is mounted
    const initTimeout = setTimeout(() => {
      if (!canvasRef.current) {
        console.error("Canvas ref not available");
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const PADDING = 100;
      const NUM_FLIES = Math.floor(Math.random() * 3) + 3; // 3-5 flies

      // Load images
      const sampleImages = [
        "https://img.freepik.com/free-psd/sneakers-template-design_23-2151824425.jpg?semt=ais_hybrid&w=740&q=80",
        "https://business.yelp.com/wp-content/uploads/2023/11/social-media-ads-example.png",
        "https://www.smartsheet.com/sites/default/files/2023-09/IC-mcdonalds-im-lovin-it-c.jpg",
        "https://lineardesign.com/wp-content/uploads/2019/12/Google-Banner-Ads-Example-Audible-1.jpg",
        "https://static.wixstatic.com/media/0e0314_defacf16c0c04edc8087bf216b9524bb~mv2.jpg/v1/fill/w_924,h_1104,al_c,q_85,enc_avif,quality_auto/0e0314_defacf16c0c04edc8087bf216b9524bb~mv2.jpg",
      ];

      // Load background ad image
      bgAdImage.current = new Image();
      bgAdImage.current.crossOrigin = "anonymous";
      bgAdImage.current.src = sampleImages[Math.floor(Math.random() * sampleImages.length)];

      // Load fly image (using emoji as fallback if image doesn't load)
      const fly = new Image();
      fly.src = "/fly-insect.png";
      fly.onerror = () => {
        // Create emoji-based fly if image fails
        const emojiCanvas = document.createElement('canvas');
        emojiCanvas.width = 64;
        emojiCanvas.height = 64;
        const emojiCtx = emojiCanvas.getContext('2d');
        emojiCtx.font = '40px Arial';
        emojiCtx.fillText('🪰', 12, 45);
        fly.src = emojiCanvas.toDataURL();
      };
      flyImages.current = [fly];

      // Load swatter image
      swatterImage.current = new Image();
      swatterImage.current.src = "/fly-swatter.png";
      swatterImage.current.onerror = () => {
        const emojiCanvas = document.createElement('canvas');
        emojiCanvas.width = 128;
        emojiCanvas.height = 128;
        const emojiCtx = emojiCanvas.getContext('2d');
        emojiCtx.font = '80px Arial';
        emojiCtx.fillText('🪤', 20, 90);
        swatterImage.current.src = emojiCanvas.toDataURL();
      };

      // Load splatter image
      splatterImage.current = new Image();
      splatterImage.current.src = "/fly-splatter.png";
      splatterImage.current.onerror = () => {
        const emojiCanvas = document.createElement('canvas');
        emojiCanvas.width = 64;
        emojiCanvas.height = 64;
        const emojiCtx = emojiCanvas.getContext('2d');
        emojiCtx.font = '40px Arial';
        emojiCtx.fillText('💥', 12, 45);
        splatterImage.current.src = emojiCanvas.toDataURL();
      };

      // Initialize flies with random positions and velocities
      const initialFlies = Array.from({ length: NUM_FLIES }, (_, index) => ({
        id: `fly-${index}-${Date.now()}`, // Unique ID for each fly
        x: PADDING + Math.random() * (canvas.width - 2 * PADDING),
        y: PADDING + Math.random() * (canvas.height - 2 * PADDING),
        vx: (Math.random() - 0.5) * 4 + (Math.random() > 0.5 ? 1 : -1), // Ensure non-zero velocity
        vy: (Math.random() - 0.5) * 4 + (Math.random() > 0.5 ? 1 : -1),
        lastDirectionChange: Date.now(),
      }));

      setFlies(initialFlies);
      setDeadFlies([]);
      deadFliesRef.current = [];
      killedFlyIdsRef.current = new Set(); // Reset killed fly IDs
      setFliesKilled(0);
      setTotalFlies(NUM_FLIES);

      // Store flies in a ref to avoid stale closures
      let currentFlies = [...initialFlies];
      let currentSwatterPos = { x: canvas.width / 2, y: canvas.height / 2, rotation: 0 };

      // Game loop
      const animate = () => {
        if (!canvasRef.current) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background ad or fallback gradient
        if (bgAdImage.current && bgAdImage.current.complete && bgAdImage.current.naturalWidth > 0) {
          ctx.drawImage(bgAdImage.current, 0, 0, canvas.width, canvas.height);
        } else {
          // Draw a gradient background as fallback
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#1a1a2e');
          gradient.addColorStop(0.5, '#16213e');
          gradient.addColorStop(1, '#0f3460');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Add some text to make it look like an ad
          ctx.fillStyle = '#ffd700';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('SPECIAL OFFER!', canvas.width / 2, canvas.height / 2 - 20);
          ctx.font = '16px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('Swat the flies to continue', canvas.width / 2, canvas.height / 2 + 20);
        }

        const now = Date.now();

        // Draw dead flies with splatters (they don't move, just fade out)
        const currentDeadFlies = deadFliesRef.current;
        const updatedDeadFlies = [];
        
        for (const deadFly of currentDeadFlies) {
          const newOpacity = Math.max(0, deadFly.opacity - 0.01); // Slower fade
          
          if (newOpacity > 0) {
            // Draw splatter first (underneath)
            ctx.save();
            ctx.globalAlpha = newOpacity;
            if (splatterImage.current && splatterImage.current.complete && splatterImage.current.naturalWidth > 0) {
              ctx.drawImage(splatterImage.current, deadFly.x - 25, deadFly.y - 25, 50, 50);
            } else {
              // Fallback splatter - red splat
              ctx.fillStyle = '#8B0000';
              ctx.beginPath();
              ctx.arc(deadFly.x, deadFly.y, 20, 0, Math.PI * 2);
              ctx.fill();
              // Add some splatter dots
              ctx.fillStyle = '#A00000';
              for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(
                  deadFly.x + (Math.random() - 0.5) * 30,
                  deadFly.y + (Math.random() - 0.5) * 30,
                  5,
                  0,
                  Math.PI * 2
                );
                ctx.fill();
              }
            }
            
            // Draw dead fly on top of splatter
            if (flyImages.current[0] && flyImages.current[0].complete && flyImages.current[0].naturalWidth > 0) {
              ctx.drawImage(flyImages.current[0], deadFly.x - 15, deadFly.y - 15, 30, 30);
            } else {
              // Fallback dead fly
              ctx.fillStyle = '#000';
              ctx.beginPath();
              ctx.ellipse(deadFly.x, deadFly.y, 12, 8, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
            
            updatedDeadFlies.push({ ...deadFly, opacity: newOpacity });
          }
        }
        
        deadFliesRef.current = updatedDeadFlies;
        setDeadFlies(updatedDeadFlies);

        // Update and draw living flies (filter out killed ones)
        currentFlies = currentFlies
          .filter(fly => !killedFlyIdsRef.current.has(fly.id)) // Remove killed flies from animation loop
          .map(fly => {
          // Change direction every 2 seconds
          let { vx, vy, lastDirectionChange } = fly;
          if (now - lastDirectionChange > 2000) {
            vx = (Math.random() - 0.5) * 6 + (Math.random() > 0.5 ? 1 : -1);
            vy = (Math.random() - 0.5) * 6 + (Math.random() > 0.5 ? 1 : -1);
            lastDirectionChange = now;
          }

          // Update position
          let newX = fly.x + vx;
          let newY = fly.y + vy;

          // Bounce off borders with padding
          if (newX < PADDING || newX > canvas.width - PADDING) {
            vx = -vx;
            newX = Math.max(PADDING, Math.min(canvas.width - PADDING, newX));
          }
          if (newY < PADDING || newY > canvas.height - PADDING) {
            vy = -vy;
            newY = Math.max(PADDING, Math.min(canvas.height - PADDING, newY));
          }

          // Draw fly with rotation based on direction of travel
          const flyRotation = Math.atan2(vy, vx);
          ctx.save();
          ctx.translate(newX, newY);
          ctx.rotate(flyRotation+90);
          
          if (flyImages.current[0] && flyImages.current[0].complete && flyImages.current[0].naturalWidth > 0) {
            ctx.drawImage(flyImages.current[0], -15, -15, 30, 30);
          } else {
            // Fallback fly drawing
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            // Wings
            ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
            ctx.beginPath();
            ctx.ellipse(-8, -5, 8, 4, -0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(8, -5, 8, 4, 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.restore();

          return { ...fly, x: newX, y: newY, vx, vy, lastDirectionChange };
        });

        setFlies([...currentFlies]);

        // Draw swatter at current position (bigger - 128x128)
        ctx.save();
        ctx.translate(currentSwatterPos.x, currentSwatterPos.y);
        ctx.rotate(currentSwatterPos.rotation);
        if (swatterImage.current && swatterImage.current.complete && swatterImage.current.naturalWidth > 0) {
          ctx.drawImage(swatterImage.current, -64, -64, 128, 128);
        } else {
          // Fallback swatter drawing (bigger)
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(-12, -75, 24, 150);
          ctx.fillStyle = '#CD853F';
          ctx.fillRect(-50, -75, 100, 60);
          // Grid pattern
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          for (let i = -40; i <= 40; i += 15) {
            ctx.beginPath();
            ctx.moveTo(i, -75);
            ctx.lineTo(i, -15);
            ctx.stroke();
          }
          for (let i = -65; i <= -15; i += 15) {
            ctx.beginPath();
            ctx.moveTo(-50, i);
            ctx.lineTo(50, i);
            ctx.stroke();
          }
        }
        ctx.restore();

        gameAnimationRef.current = requestAnimationFrame(animate);
      };

      // Listen for swatter position updates
      const handleSwatterUpdate = () => {
        setSwatterPos(pos => {
          currentSwatterPos = pos;
          return pos;
        });
      };
      
      const swatterUpdateInterval = setInterval(handleSwatterUpdate, 16);

      animate();

      // Auto-close after 20 seconds
      const autoCloseTimer = setTimeout(() => {
        setOpenPopupAdModal(false);
        setFlies([]);
        setDeadFlies([]);
        deadFliesRef.current = [];
        killedFlyIdsRef.current = new Set();
        setFliesKilled(0);
        setTotalFlies(0);
      }, 20000);

      // Store cleanup refs
      gameAnimationRef.current = { 
        cleanup: () => {
          cancelAnimationFrame(gameAnimationRef.current);
          clearInterval(swatterUpdateInterval);
          clearTimeout(autoCloseTimer);
        }
      };
    }, 100); // 100ms delay to ensure canvas is mounted

    return () => {
      clearTimeout(initTimeout);
      if (gameAnimationRef.current) {
        if (typeof gameAnimationRef.current.cleanup === 'function') {
          gameAnimationRef.current.cleanup();
        } else {
          cancelAnimationFrame(gameAnimationRef.current);
        }
      }
    };
  }, [openPopupAdModal]);

  // Check if all flies are killed and close modal
  useEffect(() => {
    if (totalFlies > 0 && fliesKilled >= totalFlies && openPopupAdModal) {
      setTimeout(() => {
        setOpenPopupAdModal(false);
        setFlies([]);
        setDeadFlies([]);
        deadFliesRef.current = [];
        killedFlyIdsRef.current = new Set();
        setFliesKilled(0);
        setTotalFlies(0);
      }, 3000);
    }
  }, [fliesKilled, totalFlies, openPopupAdModal]);

  // Submit support ticket form (placeholder)
  const handleSubmitSupportTicket = async () => {
    console.log("Submitting support ticket with:", {
      supportProblemType,
      supportTitle,
      supportMessage,
      supportContactInfo,
      supportUsername: userData.username || supportUsername,
      supportUserId: userData.id || "0", // Fallback to 0 if userData is not available
    });

    // Use the authentication endpoint we set up in the server
    const feedbackResponse = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // email: email, // Using email as username for login
        // password: password,
        supportProblemType,
        supportTitle,
        supportMessage,
        supportContactInfo,
        supportUsername: userData.username || supportUsername,
        supportUserId: userData.id || "0", // Fallback to 0 if userData is not available
      })
    });

    if (!feedbackResponse.ok) {
      const errorData = await feedbackResponse.json();
      throw new Error(errorData.message || 'Feedback submission failed');
    }

    const feedbackData = await feedbackResponse.json();
    console.log('✅ Feedback response from server:', feedbackData);


    setSupportProblemType("");
    setSupportTitle("");
    setSupportMessage("");
    setSupportContactInfo("");
    setOpenSupportModal(false);
    setSnackbarMessage("Support ticket submitted successfully");
    setOpenSnackbar(true);
  };

  // FAQ search (placeholder)
  const handleFaqSearch = () => {
    console.log("Searching FAQ with:", faqSearch);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        maxWidth: "1200px",
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minHeight: "100vh",
        backgroundColor: "#0a0a0a", // Deep black background
        color: "#ffffff", // White text
      }}
    >
      <Typography
        variant="h4"
        align="center"
        gutterBottom
        sx={{
          color: "#ffd700", // Gold/yellow text
          fontWeight: "bold",
          textShadow: "0 0 10px rgba(255, 215, 0, 0.5)",
          mb: 4,
        }}
      >
        Welcome to Linx!
      </Typography>

      {/* Main Sections */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
        }}
      >
        {/* Explanation Section */}
        <Paper
          sx={{
            flex: 1,
            p: 3,
            backgroundColor: "#1a1a1a", // Dark background
            color: "#ffffff", // White text
            border: "1px solid #ffd700", // Gold border
            boxShadow: "0 4px 20px rgba(255, 215, 0, 0.2)",
          }}
        >
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              color: "#00e676", // Green accent for headings
              fontWeight: "bold",
              mb: 3,
            }}
          >
            What is Linx
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 2,
              color: "#e0e0e0", // Light gray text for readability
              lineHeight: 1.6,
            }}
          >
            Linx is a platform that allows content creators to upload
            videos or images and scramble them up to hide/obscure exclusive
            content solely for their subscribers or followers. Stop, no more
            worrying about leaks, scrambling algoritms have you covered.
          </Typography>
          <Box
            sx={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              overflow: "hidden",
              mb: 2,
            }}
          >
            <iframe
              src="https://www.youtube.com/embed/Q_KxEMxn2pc"
              title="Intro Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            ></iframe>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "center",
            }}
          >
            {/* if the user is not logged in */}
            {localStorage.getItem("userdata") ? null : (
              <Button
                variant="outlined"
                onClick={() => navigate("/login")}
                sx={{
                  borderColor: "#ffd700",
                  color: "#ffd700",
                  "&:hover": {
                    borderColor: "#ffed4e",
                    backgroundColor: "rgba(255, 215, 0, 0.1)",
                    color: "#ffed4e",
                  },
                }}
              >
                Log In to Linx
              </Button>
            )}

            {/* if the user is logged in */}
            {!localStorage.getItem("userdata") ? null : (
              <Button
                variant="outlined"
                onClick={() => navigate("/dashboard")}
                sx={{
                  borderColor: "#00e676",
                  color: "#00e676",
                  "&:hover": {
                    borderColor: "#00c853",
                    backgroundColor: "rgba(0, 230, 118, 0.1)",
                    color: "#00c853",
                  },
                }}
              >
                Go to Dashboard
              </Button>
            )}

          </Box>
        </Paper>

        {/* News Section */}
        <Paper
          sx={{
            flex: 1,
            p: 3,
            backgroundColor: "#1a1a1a",
            color: "#ffffff",
            border: "1px solid #ffd700",
            boxShadow: "0 4px 20px rgba(255, 215, 0, 0.2)",
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              color: "#00e676",
              fontWeight: "bold",
              mb: 2,
            }}
          >
            News
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 2,
              color: "#e0e0e0",
              lineHeight: 1.6,
            }}
          >
            {/* <strong> Welcome to our News & Info page! </strong> */}
            We just launched, enjoy the service, new features are coming soon
            (new scrambling filters and algorithms)!!! Be sure to leave you
            opinion coming soon.
            {/* <strong>• Next steps: </strong> */}
            <p>
              {" "}
              <strong>Next steps: </strong>
              We plan to release a web-app version that you can download on your
              phone.
            </p>
            <p>
              Audio Scrambler mode coming soon (for Basic Plan members and higher)
            </p>

            Better Leak Detector modes coming soon (for Premium Plan members)
          </Typography>
          <Box
            sx={{
              position: "relative",
              paddingBottom: "56.25%",
              height: 0,
              overflow: "hidden",
            }}
          >
            <iframe
              src="https://www.youtube.com/embed/Q_KxEMxn2pc"
              title="News Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            ></iframe>
          </Box>
        </Paper>

        {/* How to Use Section */}
        <Paper
          sx={{
            flex: 1,
            p: 3,
            backgroundColor: "#1a1a1a",
            color: "#ffffff",
            border: "1px solid #ffd700",
            boxShadow: "0 4px 20px rgba(255, 215, 0, 0.2)",
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              color: "#00e676",
              fontWeight: "bold",
              mb: 2,
            }}
          >
            How to Use
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography
              variant="body1"
              sx={{
                mb: 1,
                color: "#e0e0e0",
                lineHeight: 1.6,
              }}
            >
              Below is a quick tutorial video on how to use Linx. You
              can click "Go" next to each section to jump to that part of the
              video.
            </Typography>

            <Box
              sx={{
                position: "relative",
                paddingBottom: "56.25%",
                height: 0,
                overflow: "hidden",
                mt: 2,
              }}
            >
              <iframe
                ref={howToVideoRef}
                src="https://www.youtube.com/embed/Q_KxEMxn2pc"
                title="How-to Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
              ></iframe>
            </Box>
            <Divider sx={{ backgroundColor: "#ffd700", opacity: 0.7 }} />
            <Typography
              variant="h6"
              sx={{ color: "#ffd700", fontWeight: "bold" }}
            >
              <Button
                variant="text"
                onClick={() => handleSeekTo(60)}
                sx={{
                  color: "#00e676",
                  fontWeight: "bold",
                  "&:hover": { backgroundColor: "rgba(0, 230, 118, 0.1)" },
                }}
              >
                Go
              </Button>{" "}
              • Using the Scramblers
            </Typography>
            {/* List of sections with "Go" buttons */}
            <Typography variant="body2" sx={{ color: "#e0e0e0" }}>
              <Button
                variant="text"
                onClick={() => handleSeekTo(10)}
                sx={{
                  color: "#00e676",
                  "&:hover": { backgroundColor: "rgba(0, 230, 118, 0.1)" },
                }}
              >
                Go
              </Button>{" "}
              • Photos
            </Typography>

            <Typography variant="body2" sx={{ color: "#e0e0e0" }}>
              <Button
                variant="text"
                onClick={() => handleSeekTo(35)}
                sx={{
                  color: "#00e676",
                  "&:hover": { backgroundColor: "rgba(0, 230, 118, 0.1)" },
                }}
              >
                Go
              </Button>{" "}
              • Videos
            </Typography>

            <Divider sx={{ backgroundColor: "#ffd700", opacity: 0.7 }} />
            <Typography
              variant="h6"
              sx={{ color: "#ffd700", fontWeight: "bold" }}
            >
              <Button
                variant="text"
                onClick={() => handleSeekTo(60)}
                sx={{
                  color: "#00e676",
                  fontWeight: "bold",
                  "&:hover": { backgroundColor: "rgba(0, 230, 118, 0.1)" },
                }}
              >
                Go
              </Button>{" "}
              • Unscrambling
            </Typography>
            {/* <Divider sx={{ backgroundColor: '#ffd700', opacity: 0.7 }} /> */}
            <Typography variant="body2" sx={{ color: "#e0e0e0" }}>
              <Button
                variant="text"
                onClick={() => handleSeekTo(45)}
                sx={{
                  color: "#00e676",
                  "&:hover": { backgroundColor: "rgba(0, 230, 118, 0.1)" },
                }}
              >
                Go
              </Button>{" "}
              • Photo/Videos
            </Typography>
            <Typography variant="body2" sx={{ color: "#e0e0e0" }}>
              <Button
                variant="text"
                onClick={() => handleSeekTo(20)}
                sx={{
                  color: "#00e676",
                  "&:hover": { backgroundColor: "rgba(0, 230, 118, 0.1)" },
                }}
              >
                Go
              </Button>{" "}
              • Using the Leak Detector
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Support Section */}
      <Box
        sx={{
          textAlign: "center",
          backgroundColor: "#1a1a1a",
          p: 4,
          borderRadius: 2,
          border: "1px solid #ffd700",
          boxShadow: "0 4px 20px rgba(255, 215, 0, 0.2)",
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            color: "#ffd700",
            fontWeight: "bold",
            textShadow: "0 0 10px rgba(255, 215, 0, 0.5)",
            mb: 3,
          }}
        >
          Tell us what you think! Give us Feedback?
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Typography variant="body1" sx={{ color: "#e0e0e0" }}>
            Submit a feedback ticket
          </Typography>
          <Button
            variant="contained"
            onClick={handleOpenSupportModal}
            sx={{
              backgroundColor: "#00e676",
              color: "#000000",
              fontWeight: "bold",
              "&:hover": {
                backgroundColor: "#00c853",
                boxShadow: "0 0 15px rgba(0, 230, 118, 0.5)",
              },
            }}
          >
            Feedback
          </Button>
        </Box>
      </Box>

      {/* Advertisement Section */}
      {/* <Paper
        elevation={1}
        sx={{
          p: 0, // Remove padding to let AdObject handle its own spacing
          mt: 2,
          overflow: 'hidden', // Prevent content overflow
          borderRadius: 2
        }}
      >
        <Box sx={{ p: 1, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
            Advertisement
          </Typography>
        </Box>

        {/* AdObject Component */}
      {/* <AdObject
          onAdView={(ad) => console.log('Ad viewed:', ad)}
          onAdClick={(ad) => console.log('Ad clicked:', ad)}
          onAdSkip={(ad) => console.log('Ad skipped:', ad)}
          onRewardClaim={(ad, amount) => console.log('Reward claimed:', amount)}
          RewardModal={({ onClose, onReward }) => (
            <div style={{ }}>
              <button onClick={() => onReward(5)}>Claim Credits</button>
              <button onClick={onClose}>Close</button>
            </div>
          )}
          showRewardProbability={0.1} // 10% chance to show reward button
          filters={{ format: 'video', mediaFormat: 'regular' }} // Only show video ads for this placement
          style={{
            minHeight: '200px', // Ensure minimum height
            borderRadius: 0 // Remove border radius to fit Paper container
          }}
          getAdById={-1}
          className="banner-ad"
        /> */}
      {/* </Paper> */}

      {/* Support Ticket Modal */}
      <Modal
        open={openSupportModal}
        onClose={handleCloseSupportModal}
        aria-labelledby="support-modal-title"
        aria-describedby="support-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "#1a1a1a", // Dark background
            color: "#ffffff", // White text
            border: "2px solid #ffd700", // Gold border
            boxShadow: "0 8px 32px rgba(255, 215, 0, 0.3)",
            p: 4,
            width: { xs: "90%", sm: "400px" },
            borderRadius: 2,
            }}
          >
            <Typography
            id="support-modal-title"
            variant="h6"
            gutterBottom
            sx={{
              color: "#ffd700",
              fontWeight: "bold",
              mb: 3,
            }}
            >
            Submit Feedback
            </Typography>
            <Select
            fullWidth
            value={supportProblemType}
            onChange={(e) => setSupportProblemType(e.target.value)}
            displayEmpty
            variant="outlined"
            MenuProps={{
              PaperProps: {
              sx: {
                bgcolor: "#2a2a2a",
                color: "#ffffff",
                "& .MuiMenuItem-root:hover": { bgcolor: "#3a3a3a" },
              },
              },
            }}
            sx={{
              mb: 2,
              "& .MuiSelect-select": {
              backgroundColor: "#2a2a2a",
              color: "#ffffff",
              },
              "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#ffd700",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#ffed4e",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#ffd700",
              },
              "& .MuiSvgIcon-root": {
              color: "#ffd700",
              },
            }}
            >
            <MenuItem value="" disabled>
              Select Feedback Type
            </MenuItem>
            <MenuItem value="improvement-issue">Improvement/Tips</MenuItem>
            <MenuItem value="account-issue">Bugs/App Issues</MenuItem>
            <MenuItem value="account-issue">Account Issue</MenuItem>
            <MenuItem value="billing-issue">Billing Issue</MenuItem>
            <MenuItem value="report-scammer">Report Scammer/Abuse</MenuItem>
            <MenuItem value="other">Other</MenuItem>
            </Select>
            <TextField
            label="Title"
            fullWidth
            value={supportTitle}
            onChange={(e) => setSupportTitle(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiInputLabel-root": { color: "#ffd700" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#ffd700" },
              "& .MuiOutlinedInput-root": {
              backgroundColor: "#2a2a2a",
              color: "#ffffff9f",
              "& fieldset": { borderColor: "#ffd700" },
              "&:hover fieldset": { borderColor: "#ffed4e" },
              "&.Mui-focused fieldset": { borderColor: "#ffd700" },
              },
            }}
            />
            <TextField
            label="Message"
            fullWidth
            multiline
            rows={3}
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiInputLabel-root": { color: "#ffd700" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#ffd700" },
              "& .MuiOutlinedInput-root": {
              backgroundColor: "#2a2a2a",
              color: "#ffffff",
              "& fieldset": { borderColor: "#ffd700" },
              "&:hover fieldset": { borderColor: "#ffed4e" },
              "&.Mui-focused fieldset": { borderColor: "#ffd700" },
              },
            }}
            />
            <TextField
            label="Email or Other Contact Info"
            fullWidth
            value={supportContactInfo}
            onChange={(e) => setSupportContactInfo(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiInputLabel-root": { color: "#ffd700" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#ffd700" },
              "& .MuiOutlinedInput-root": {
              backgroundColor: "#2a2a2a",
              color: "#ffffff",
              "& fieldset": { borderColor: "#ffd700" },
              "&:hover fieldset": { borderColor: "#ffed4e" },
              "&.Mui-focused fieldset": { borderColor: "#ffd700" },
              },
            }}
            />

            <TextField
            label="Username"
            fullWidth
            value={supportUsername}
            onChange={(e) => setSupportUsername(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiInputLabel-root": { color: "#ffd700" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#ffd700" },
              "& .MuiOutlinedInput-root": {
              backgroundColor: "#2a2a2a",
              color: "#ffffff",
              "& fieldset": { borderColor: "#ffd700" },
              "&:hover fieldset": { borderColor: "#ffed4e" },
              "&.Mui-focused fieldset": { borderColor: "#ffd700" },
              },
            }}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="text"
              onClick={handleCloseSupportModal}
              sx={{
              color: "#e0e0e0",
              "&:hover": { backgroundColor: "rgba(224, 224, 224, 0.1)" },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitSupportTicket}
              sx={{
              backgroundColor: "#00e676",
              color: "#000000",
              fontWeight: "bold",
              "&:hover": {
                backgroundColor: "#00c853",
                boxShadow: "0 0 15px rgba(0, 230, 118, 0.5)",
              },
              }}
            >
              Submit
            </Button>
            </Box>
          </Box>
          </Modal>

          {/* Popup Ad Modal */}
      <Modal
        open={openPopupAdModal}
        onClose={() => {}} // Disable closing by clicking backdrop
        disableEscapeKeyDown // Disable closing with ESC key
        aria-labelledby="popup-ad-modal-title"
        aria-describedby="popup-ad-modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "#1a1a1a",
            color: "#ffffff",
            border: "2px solid #ffd700",
            boxShadow: "0 8px 32px rgba(255, 215, 0, 0.3)",
            p: 2,
            width: { xs: "90%", sm: "600px" },
            borderRadius: 2,
          }}
        >
          <Typography
            id="popup-ad-modal-title"
            variant="h6"
            gutterBottom
            sx={{
              color: "#ffd700",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Swat the Flies to Continue! ({fliesKilled}/{totalFlies})
          </Typography>

          <canvas
            ref={canvasRef}
            id="popupAdCanvas"
            width="560"
            height="315"
            onMouseMove={handleCanvasMove}
            onTouchMove={handleCanvasMove}
            onClick={handleCanvasClick}
            onTouchEnd={handleCanvasClick}
            style={{
              border: "1px solid #ffd700",
              width: "100%",
              height: "auto",
              backgroundColor: "#0a0a0a",
              cursor: "none",
              touchAction: "none",
            }}
          >
            Your browser does not support the canvas element.
          </canvas>

          <Typography
            id="popup-ad-modal-description"
            variant="body2"
            sx={{ color: "#e0e0e0", mt: 1, textAlign: "center" }}
          >
            Double-click on the flies to swat them! 🪰
            {fliesKilled >= totalFlies && totalFlies > 0 && (
              <span style={{ color: "#00e676", fontWeight: "bold" }}>
                {" "}
                - Great job! Closing in 3 seconds...
              </span>
            )}
          </Typography>
        </Box>
      </Modal>

      {/* Snackbar for notifications */}
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default Info;
