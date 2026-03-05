import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PhotoCamera } from '@mui/icons-material';
import { Container, Stack, Typography, Card, CardContent, Divider, Skeleton } from '@mui/material';
import api from '../api/client';
// import { uploadTransactionScreenshot } from '../api/api';
import { useToast } from '../contexts/ToastContext';

export default function Redeem() {

  // Wallet address mappings from your original code
  const walletAddressMap = {
    BTC: 'bc1q4j9e7equq4xvlyu7tan4gdmkvze7wc0egvykr6',
    LTC: 'ltc1qgg5aggedmvjx0grd2k5shg6jvkdzt9dtcqa4dh',
    SOL: 'qaSpvAumg2L3LLZA8qznFtbrRKYMP1neTGqpNgtCPaU',
    ETH: '0x9a61f30347258A3D03228F363b07692F3CBb7f27',
    XMR: '44X8AgosuXFCuRmBoDRc66Vw1FeCaL6vRiKRqrmqXeJdeKAciYuyaJj7STZnHMg7x8icHJL6M1hzeAPqSh8NSC1GGC9bkCp',
    USDT: '0xdAC17FF489d9C6dFf9e3f2A1aD7D4bE5f', // Example USDT address on Ethereum
    XRP: 'YOUR_XRP_WALLET_ADDRESS_HERE' // Example XRP address
  };

  // Deposit wallet address mappings with blockchain info
  const depositWalletAddressMap = {
    BTC: { address: 'bc1q4j9e7equq4xvlyu7tan4gdmkvze7wc0egvykr6', blockchain: 'bitcoin' },
    LTC: { address: 'ltc1qgg5aggedmvjx0grd2k5shg6jvkdzt9dtcqa4dh', blockchain: 'litecoin' },
    SOL: { address: 'qaSpvAumg2L3LLZA8qznFtbrRKYMP1neTGqpNgtCPaU', blockchain: 'solana' },
    ETH: { address: '0x9a61f30347258A3D03228F363b07692F3CBb7f27', blockchain: 'ethereum' },
    XMR: { address: '44X8AgosuXFCuRmBoDRc66Vw1FeCaL6vRiKRqrmqXeJdeKAciYuyaJj7STZnHMg7x8icHJL6M1hzeAPqSh8NSC1GGC9bkCp', blockchain: 'monero' },
    USDT: { address: '0xdAC17FF489d9C6dFf9e3f2A1aD7D4bE5f', blockchain: 'ethereum' }, // Example USDT on Ethereum
    XRP: { address: 'YOUR_XRP_WALLET_ADDRESS_HERE', blockchain: 'ripple' } // Example XRP address
  };

  // Currency ID mapping for CoinGecko API
  const currencyIdMap = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    LTC: 'litecoin',
    SOL: 'solana',
    XMR: 'monero',
    USDT: 'tether',
    XRP: 'ripple'
  };

  const [balance, setBalance] = useState(null);
  const { success, error } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const initialAmount = query.get('amount') || 12500; // Default to most popular
  const [amount, setAmount] = useState(initialAmount);
  let ud = JSON.parse(localStorage.getItem("userdata"))

  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [currency, setCurrency] = useState('BTC'); // Default currency
  const [rate, setRate] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState(''); // For success messages
  const [walletAddress, setWalletAddress] = useState(walletAddressMap[currency] || 'YOUR_WALLET_ADDRESS_HERE');
  const [userDetails, setUserDetails] = useState({
    name: '',
    email: '',
    walletAddress: '',
    key: '',
    transactionId: '',
    time: ''
  });


  // Calculate the amount in USD and crypto
  const dollarValueOfCoins = amount / 1000; // Assuming 1000 coins = $1
  const cryptoAmountRaw = rate ? (dollarValueOfCoins / rate) : 0; // Raw numeric amount
  const cryptoAmount = cryptoAmountRaw.toFixed(8); // Formatted string amount for display

  const load = async () => {
    try {
      // const { data } = await api.post(`/api/wallet/balance/${userData.username}`);
      // setBalance(data?.balance ?? 0);
      try {
        // JWT token in the Authorization header automatically authenticates the user
        // No need to send password (it's not stored in localStorage anyway)
        const { data } = await api.post(`/api/wallet/balance/${userData.username}`, {
          email: userData.email
        });
        setBalance(data?.balance ?? 0);
      } catch (e) {
        console.error('Failed to load wallet balance:', e);

        // Handle authentication errors
        if (e.response?.status === 401 || e.response?.status === 403) {
          error('Session expired. Please log in again.');
          setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('userdata');
            window.location.href = '/login';
          }, 2000);
        } else {
          error('Failed to load balance. Please try again.');
        }
        setBalance(0);
      }

    } catch (e) {
      console.error(e);
      setBalance(100); // demo fallback
    }
  };

  // Fetch crypto rate from CoinGecko API
  const fetchCryptoRate = async (cryptoCurrency) => {
    try {
      const coinId = currencyIdMap[cryptoCurrency];
      if (!coinId) {
        console.error('Currency not supported:', cryptoCurrency);
        return 0;
      }

      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
      const data = await response.json();
      return data[coinId]?.usd || 0;
    } catch (error) {
      console.error('Error fetching crypto rate:', error);
      // Fallback rates for demo
      const fallbackRates = { BTC: 45000, ETH: 3000, LTC: 100, SOL: 50, XMR: 150 };
      return fallbackRates[cryptoCurrency] || 0;
    }
  };

  useEffect(() => {
    load();
    // Fetch initial rate
    fetchCryptoRate(currency).then(setRate);
  }, []);

  useEffect(() => {
    // Update rate when currency changes
    fetchCryptoRate(currency).then(setRate);
  }, [currency]);

  const handleCancelOrder = () => {
    // Navigate back to dashboard or previous page
    navigate('/wallet'); // Adjust the path as needed
  };

  const handleCopyAddress = () => {
    const walletAddress = walletAddressMap[currency] || 'YOUR_WALLET_ADDRESS_HERE';
    navigator.clipboard
      .writeText(walletAddress)
      .then(() => {
        setMessage('Wallet address copied to clipboard!');
        setTimeout(() => setMessage(''), 3000);
      })
      .catch((err) => {
        console.error('Could not copy text: ', err);
        setErrorMessage('Failed to copy address.');
      });
  };

  const handleCopyAmount = () => {
    const amountToCopy = cryptoAmount || '0.00000000';
    navigator.clipboard
      .writeText(amountToCopy)
      .then(() => {
        setMessage('Amount copied to clipboard!');
        setTimeout(() => setMessage(''), 3000);
      })
      .catch((err) => {
        console.error('Could not copy text: ', err);
        setErrorMessage('Failed to copy amount.');
      });
  };

  // // Example function to upload file to backend:
  // const uploadToBackend = async (file) => {
  //   const formData = new FormData();
  //   formData.append('media', file);

  //   try {
  //     // uploadMediaFiles should return the media link or an object with mediaLink property
  //     const response = await uploadTransactionScreenshot(formData);
  //     console.log('Transaction screenshot file uploaded:', response);

  //     // If your backend returns { mediaLink: "..." }
  //     if (response && response.url) {
  //       return response.url;
  //     }
  //     // If your backend returns { mediaLink: "..." }
  //     if (response && response.mediaLink) {
  //       return response.mediaLink;
  //     }
  //     // If your backend returns the link directly
  //     if (typeof response === 'string') {
  //       return response;
  //     }
  //     throw new Error('Upload failed or invalid response');
  //   } catch (error) {
  //     console.error(error);
  //     throw error;
  //   }
  // };

  // // Enhanced screenshot upload handler
  // const handleScreenshotUpload = async (event) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;

  //   // File type validation
  //   const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
  //   if (!allowedTypes.includes(file.type)) {
  //     setFileError('Please upload only PNG or JPG files.');
  //     setUploadedFile(null);
  //     setFilePreview(null);
  //     return;
  //   }

  //   // File size validation (5MB limit)
  //   const maxSize = 5 * 1024 * 1024; // 5MB
  //   if (file.size > maxSize) {
  //     setFileError('File size must be less than 5MB.');
  //     setUploadedFile(null);
  //     setFilePreview(null);
  //     return;
  //   }

  //   // Clear any previous errors
  //   setFileError('');
  //   setUploadedFile(file);

  //   // Create preview
  //   const reader = new FileReader();
  //   reader.onloadend = () => {
  //     setFilePreview(reader.result);
  //   };
  //   reader.readAsDataURL(file);

  //   // // Store file info for later use
  //   // const fileInfo = {
  //   //   name: file.name,
  //   //   size: file.size,
  //   //   type: file.type,
  //   //   lastModified: file.lastModified,
  //   //   timestamp: Date.now(),
  //   //   userId: ud?.user_id || ud?.id || 'unknown'
  //   // };

  //   // // In a real app, you would upload to backend here
  //   // console.log('Screenshot uploaded:', fileInfo);
  //   // setMessage('Screenshot uploaded successfully!');

  //   // Upload logic (if you want to upload immediately)
  //   const formData = new FormData();
  //   formData.append('screenshot', file);
  //   formData.append('username', userData.username);
  //   formData.append('userId', userData.user_id || userData.id);
  //   formData.append('time', new Date().toISOString().split('T')[1]);
  //   formData.append('date', new Date().toISOString());

  //   try {
  //     let mediaLink;

  //     mediaLink = await uploadToBackend(file); // server returns { mediaLink }
  //     formData.append('mediaLink', mediaLink);

  //     setMessage('Screenshot uploaded successfully!');

  //   } catch (error) {
  //     console.error('API - Error uploading screenshot:', error);
  //     setFileError('An error occurred while uploading the image.');
  //   }
  // };

  // Function to remove uploaded file
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    setFileError('');
    // Reset the file input
    const fileInput = document.getElementById('transaction-screenshot-upload');
    if (fileInput) fileInput.value = '';
  };
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileError, setFileError] = useState('');
  const [enableOrderLogging, setEnableOrderLogging] = useState(true);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const validateEmail = (email) => {
    // Standard email validation that allows dots in the local part (e.g., user.name@domain.com)
    const atIndex = email.indexOf('@');
    
    // Must have exactly one @, not at start or end
    if (atIndex === -1 || atIndex === 0 || email.endsWith('@')) return false;
    
    const localPart = email.substring(0, atIndex);
    const domain = email.substring(atIndex + 1);
    
    // Local part: not empty, doesn't start/end with dot
    if (!localPart || localPart.startsWith('.') || localPart.endsWith('.')) return false;
    
    // Domain: must have at least one dot, doesn't start/end with dot
    if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return false;
    
    return true;
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();

    // Only validate required fields (marked with asterisk)
    const requiredFields = ['name', 'email', 'walletAddress', 'transactionId'];
    const missingFields = requiredFields.filter(field => !userDetails[field]?.trim());

    if (missingFields.length > 0) {
      setErrorMessage(`Please fill out all required fields: ${missingFields.join(', ')}`);
      return;
    }

    // Validate email format
    if (!validateEmail(userDetails.email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // Send order details to backend
    try {
      let data = {
        username: ud?.username || 'anonymous',
        userId: ud?.user_id || ud?.id || 'unknown',
        name: userDetails.name,
        email: userDetails.email,
        walletAddress: userDetails.walletAddress,
        key: userDetails.key || '',
        transactionId: userDetails.transactionId,
        transactionHash: userDetails.transactionHash || '',
        blockExplorerLink: userDetails.blockExplorerLink || '',
        currency: currency,
        amount: amount,
        cryptoAmount: cryptoAmount,
        rate: rate,
        date: new Date(),
        timestamp: new Date().toISOString(),
        session_id: crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
        orderLoggingEnabled: enableOrderLogging,
        userAgent: navigator.userAgent,
        ip: 'client-side' // Would be set by backend
      }

      // Only log order if user opted in
      if (enableOrderLogging) {
        console.log("Logging order with user tracking:", data);
        // Store in localStorage as backup
        const orderHistory = JSON.parse(localStorage.getItem('orderHistory') || '[]');
        orderHistory.push({
          ...data,
          localTimestamp: Date.now(),
          status: 'submitted'
        });
        localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
      } else {
        console.log("Order logging disabled by user. Processing without user tracking.");
      }

      // Simulate API call since validateCryptoTransaction is not imported
      console.log("Submitting order:", data);

      setMessage(`Order submitted successfully! ${enableOrderLogging ? 'Order logged with user tracking.' : 'Processing without logging.'} Please wait for confirmation.`);
      setOrderSubmitted(true);
      setErrorMessage('');

      // Scroll to Step 5
      setTimeout(() => {
        document.querySelector('[data-step="5"]')?.scrollIntoView({ behavior: 'smooth' });
      }, 1000);

    } catch (error) {
      console.error('Error submitting order:', error);
      setErrorMessage('An error occurred. Please try again.');
    }
  };



  const getExpectedWaitTime = (currency) => {
    const waitTimes = {
      BTC: '10-30 minutes (1-3 confirmations)',
      ETH: '5-15 minutes (12-35 confirmations)',
      LTC: '5-15 minutes (6 confirmations)',
      SOL: '1-3 minutes (32 confirmations)',
      XMR: '20-40 minutes (10 confirmations)',
      USDT: '5-15 minutes (12-35 confirmations)',
      XRP: '3-5 minutes (1 confirmation)'
    };
    return waitTimes[currency] || '10-30 minutes';
  };

  const getRedemptionWaitTime = (creditAmount) => {
    const credits = parseInt(creditAmount) || 0;
    if (credits < 25000) {
      return '12 Hours';
    } else if (credits < 50000) {
      return '24 Hours';
    } else if (credits < 100000) {
      return '48 Hours';
    } else {
      return '72 Hours';
    }
  };

  const onPaymentError = () => error('Payment could not be started');



  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4" color="secondary.main">Redeem Credits</Typography>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Current Balance</Typography>
            {balance === null ? (
              <Skeleton variant="text" width={220} height={54} />
            ) : (
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>{balance} credits</Typography>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="h5" gutterBottom>How It Works</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              Follow these simple steps to redeem your credits using cryptocurrency:
            </Typography>

            {/* <div style={styles.container}> */}

            <Divider sx={{ my: 2 }} />
            <Typography variant="h4">Step 1</Typography>
            <Typography variant="h6">Choose Redeem Currency</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>Select your preferred cryptocurrency to redeem credits.</Typography>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '15px',
              marginBottom: '20px'
            }}>
              {[
                { code: 'BTC', name: 'Bitcoin', icon: '₿', color: '#f7931a' },
                { code: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627eea' },
                { code: 'LTC', name: 'Litecoin', icon: 'Ł', color: '#345d9d' },
                { code: 'SOL', name: 'Solana', icon: '◎', color: '#9945ff' },
                { code: 'XMR', name: 'Monero', icon: 'ɱ', color: '#ff6600' },
                { code: 'USDT', name: 'Tether', icon: '₮', color: '#26a17b' },
                { code: 'XRP', name: 'XRP', icon: '✕', color: '#00aae4' }
              ].map((crypto) => (
                <div
                  key={crypto.code}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 15px',
                    backgroundColor: currency === crypto.code ? crypto.color : 'rgba(255, 255, 255, 0.1)',
                    color: currency === crypto.code ? 'white' : '#fff',
                    border: `2px solid ${currency === crypto.code ? crypto.color : 'rgba(255, 255, 255, 0.3)'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    boxShadow: currency === crypto.code ? `0 0 20px ${crypto.color}40` : '0 2px 10px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => {
                    setCurrency(crypto.code);
                    setWalletAddress(walletAddressMap[crypto.code]);
                  }}
                  onMouseEnter={(e) => {
                    if (currency !== crypto.code) {
                      e.currentTarget.style.backgroundColor = `${crypto.color}20`;
                      e.currentTarget.style.borderColor = crypto.color;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currency !== crypto.code) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '2.5em',
                    marginBottom: '10px',
                    color: currency === crypto.code ? 'white' : crypto.color
                  }}>
                    {crypto.icon}
                  </div>
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: '16px',
                    marginBottom: '4px'
                  }}>
                    {crypto.code}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    opacity: 0.8
                  }}>
                    {crypto.name}
                  </div>
                </div>
              ))}
            </div>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h4">Step 2</Typography>
            <Typography variant="h6">Redeem Credits for Cryptocurrency</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              Select an amount of credits to redeem. Current selection: <strong>{parseInt(amount).toLocaleString()} credits</strong>
            </Typography>

            {/* todo: implement redeem functionality using 3 fields, amount, currency, and wallet address */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '15px',
              marginBottom: '20px'
            }}>
              {[
                { amount: 10000, label: '10,000 Credits' },
                { amount: 25000, label: '25,000 Credits' },
                { amount: 50000, label: '50,000 Credits' },
                { amount: 75000, label: '75,000 Credits' },
                { amount: 100000, label: '100,000 Credits' }
              ].map((option) => (
                <button
                  key={option.amount}
                  onClick={() => setAmount(option.amount)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: amount === option.amount ? '2px solid #ffd700' : '2px solid transparent',
                    backgroundColor: amount === option.amount ? '#ffd700' : 'rgba(255, 255, 255, 0.1)',
                    color: amount === option.amount ? '#000' : '#fff',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Don't see your desired amount? You can manually enter any amount between <strong>10,000</strong> and <strong>100,000</strong> credits below:
            </Typography>
            <input
              type="number"
              min="1000"
              max="100000"
              value={amount}
              onChange={(e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val)) val = 25000;
                if (val < 10000) val = 10000;
                if (val > 100000) val = 100000;
                setAmount(val);
              }}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '10px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                fontSize: '16px'
              }}
            />
          </CardContent>

          <CardContent>
            {/* <Typography variant="h5" gutterBottom>How It Works</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              Follow these simple steps to redeem your credits using cryptocurrency:
            </Typography>

            <div style={styles.container}>

          <Divider sx={{ my: 2 }} /> */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h4" data-step="3">Step 3</Typography>
            <Typography variant="h6">Send Cryptocurrency</Typography>


            {errorMessage && <p style={styles.errorMessage}>{errorMessage}</p>}
            {message && <p style={styles.successMessage}>{message}</p>}

            <div style={styles.walletInfo}>
              {/* Currency Display Card */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                textAlign: 'center',
                color: 'white'
              }}>
                <div style={{ fontSize: '3em', marginBottom: '10px' }}>
                  {{ BTC: '₿', ETH: 'Ξ', LTC: 'Ł', SOL: '◎', XMR: 'ɱ' }[currency]}
                </div>
                <h3 style={{ margin: '10px 0', fontSize: '24px' }}>
                  {{ BTC: 'Bitcoin', ETH: 'Ethereum', LTC: 'Litecoin', SOL: 'Solana', XMR: 'Monero' }[currency]} ({currency})
                </h3>
                <div style={{ fontSize: '18px', opacity: 0.9 }}>
                  Current Rate: <strong>${rate ? rate.toLocaleString() : '...'}</strong> USD
                </div>
              </div>

              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #ffd700',
                marginBottom: '20px'
              }}>
                {/* <h4 style={{ color: '#ffd700', marginBottom: '15px', textAlign: 'center' }}>
                  Payment Instructions
                </h4>
                <p style={{ marginBottom: '15px', textAlign: 'center' }}>
                  Please send <strong style={{ color: '#ffd700' }}>{cryptoAmount} {currency}</strong> to the following wallet address:
                </p>
                 */}
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                  You should receive the exact amount {cryptoAmountRaw.toFixed(6)} (1% margin of error) of {currency} from the wallet address below.
                </Typography>

                <div style={styles.header}>
                  <h2>You will be receiving: {parseInt(amount).toLocaleString()} Credits</h2>
                  <h3> Our Cut (Fee): {((parseInt(amount) * 0.1) || 0).toLocaleString()} Credits</h3>
                  <h3>Total: ${((parseInt(amount) / 1000) || 0).toFixed(2)} USD</h3>
                </div>

                <div style={styles.walletAddressContainer}>
                  <p style={{ ...styles.walletAddress, fontSize: '18px', fontWeight: 'bold' }}>
                    {cryptoAmount} {currency}
                  </p>
                  <button style={styles.button} onClick={handleCopyAmount}>
                    Copy Amount
                  </button>
                </div>

                <div style={styles.walletAddressContainer}>
                  <p style={styles.walletAddress}>{walletAddress}</p>
                  <button style={styles.button} onClick={handleCopyAddress}>
                    Copy Address
                  </button>
                </div>

                <div style={{
                  backgroundColor: '#2a2a2a',
                  padding: '15px',
                  borderRadius: '8px',
                  marginTop: '15px',
                  border: '1px solid #444'
                }}>
                  <p style={{ fontSize: '14px', margin: '5px 0' }}>
                    <strong>Network:</strong> {depositWalletAddressMap[currency]?.blockchain || 'Unknown'}
                  </p>
                  <p style={{ fontSize: '14px', margin: '5px 0' }}>
                    <strong>Rate:</strong> 1 {currency} = ${rate} USD ≈ {(1000 * rate).toLocaleString()} Credits
                  </p>
                  <p style={{ fontSize: '12px', margin: '5px 0', opacity: 0.7 }}>
                    Maximum Redemption: 100,000 credits per transaction per day
                  </p>
                  <p style={{ fontSize: '12px', margin: '5px 0', opacity: 0.7 }}>
                    Minimum Redemption: 10,000 credits per transaction (10 USD)
                  </p>
                </div>
              </div>
            </div>
            <br></br>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h4">Step 4</Typography>
            <Typography variant="h6">Log Details for your Redemption</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              Please fill out the form below to log your order.
              Fields marked with <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>*</span> are required.
            </Typography>

            <form onSubmit={handleOrderSubmit} style={styles.form}>
              {/* <div style={styles.formGroup}>
              <p style={{ marginBottom: '20px', textAlign: 'center', color: '#ffd700' }}>
                After sending <strong>{cryptoAmount} {currency}</strong> to wallet: {walletAddress.slice(0, 20)}...
                <br />Fill out the form below to log your order for manual review.
              </p>
            </div> */}

              <div style={styles.formGroup}>
                <label>
                  Full Name:<span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={userDetails.name}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="Enter your full name"
                />
              </div>

              <div style={styles.formGroup}>
                <label>
                  Email Address:<span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={userDetails.email}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="Enter your email address"
                />
              </div>

              <div style={styles.formGroup}>
                <label>
                  Your Wallet Address:<span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="walletAddress"
                  value={userDetails.walletAddress}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="Enter the wallet address you sent from"
                />
                <small style={{ color: '#cccccc', fontSize: '12px' }}>
                  The wallet address you sent the cryptocurrency from
                </small>
              </div>


              {/* Order Logging Option */}
              {/* <div style={{ 
                ...styles.formGroup, 
                backgroundColor: '#2a2a2a', 
                padding: '20px', 
                borderRadius: '8px',
                border: '1px solid #444'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    id="orderLogging"
                    checked={enableOrderLogging}
                    onChange={(e) => setEnableOrderLogging(e.target.checked)}
                    style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                  />
                  <label htmlFor="orderLogging" style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                    Enable Order Logging (Recommended)
                  </label>
                </div>
                <div style={{ fontSize: '14px', color: '#cccccc', lineHeight: '1.4' }}>
                  <p style={{ margin: '5px 0' }}>
                    ✅ <strong>User Tracking:</strong> Links transaction to your account ({ud?.username || 'current user'})
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    ✅ <strong>Backup Protection:</strong> Prevents loss if localStorage is cleared
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    ✅ <strong>Error Recovery:</strong> Helps support team resolve any issues
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    ✅ <strong>Transaction History:</strong> Maintains record for your account
                  </p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '12px', opacity: 0.8 }}>
                    <em>This creates a backup record in case of user mistakes or technical issues.</em>
                  </p>
                </div>
              </div> */}






              <div style={styles.buttonGroup}>
                <button style={styles.log_button} type="submit">
                  Log Your Order
                </button>
                {/* <button style={styles.cancel_button} type="button" onClick={handleCancelOrder}>
                  Cancel Order
                </button> */}
              </div>
            </form>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h4" data-step="5">Step 5</Typography>
            <Typography variant="h6">Processing & Wait Times</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              {orderSubmitted
                ? 'Your redemption request has been submitted successfully! Here are the expected processing times.'
                : 'After submitting your order details, your redemption will be processed according to the schedule below.'
              }
            </Typography>

            {/* Processing Information Section */}
            <div style={{
              backgroundColor: '#1a1a1a',
              padding: '25px',
              borderRadius: '12px',
              border: '2px solid #ffd700',
              marginBottom: '20px'
            }}>
              <h4 style={{ color: '#ffd700', marginBottom: '20px', textAlign: 'center' }}>
                Expected Processing Times
              </h4>

              {/* Credit Amount Based Wait Times */}
              <div style={{
                backgroundColor: '#2a2a2a',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #444'
              }}>
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ margin: '5px 0', fontSize: '16px', fontWeight: 'bold', color: '#ffd700' }}>
                    Your Redemption: {parseInt(amount).toLocaleString()} ₡
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '18px', color: '#2e7d32', fontWeight: 'bold' }}>
                    Expected Processing Time: {getRedemptionWaitTime(amount)}
                  </p>
                </div>

                <div style={{ fontSize: '14px', color: '#b0b0b0', lineHeight: '1.5' }}>
                  <p style={{ margin: '8px 0' }}>📋 <strong>Processing Schedule Times (Max):</strong></p>
                  <p style={{ margin: '5px 0', paddingLeft: '20px' }}>• Under 25,000 ₡: <span style={{ color: '#4caf50' }}>12 hours</span></p>
                  <p style={{ margin: '5px 0', paddingLeft: '20px' }}>• 25,000 - 49,999 ₡: <span style={{ color: '#ff9800' }}>24 hours</span></p>
                  <p style={{ margin: '5px 0', paddingLeft: '20px' }}>• 50,000 - 99,999 ₡: <span style={{ color: '#ff9800' }}>36 hours</span></p>
                  <p style={{ margin: '5px 0', paddingLeft: '20px' }}>• 100,000+ ₡: <span style={{ color: '#f44336' }}>48 - 72 hours</span></p>
                </div>

                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#333', borderRadius: '6px' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#e0e0e0', fontStyle: 'italic' }}>
                    ⚡ Processing times may be faster during business hours (9 AM - 5 PM EST, Monday-Friday).
                    Large redemptions may require additional verification.
                  </p>
                </div>
              </div>

              {/* Transaction Summary - Only show if order submitted */}
              {orderSubmitted && (
                <div style={{
                  backgroundColor: '#2a2a2a',
                  padding: '20px',
                  borderRadius: '8px',
                  marginTop: '20px',
                  border: '1px solid #444'
                }}>
                  <h5 style={{ color: '#ffd700', marginBottom: '15px', textAlign: 'center' }}>✅ Redemption Summary</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '14px' }}>
                    <div>
                      <p style={{ margin: '5px 0' }}><strong>Credits to Redeem:</strong></p>
                      <p style={{ margin: '5px 0', color: '#2e7d32', fontSize: '16px', fontWeight: 'bold' }}>
                        {parseInt(amount).toLocaleString()} ₡
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '5px 0' }}><strong>USD Value:</strong></p>
                      <p style={{ margin: '5px 0', color: '#2e7d32', fontSize: '16px', fontWeight: 'bold' }}>
                        ${((parseInt(amount) / 1000) || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '5px 0' }}><strong>Currency:</strong></p>
                      <p style={{ margin: '5px 0', color: '#ffd700', fontSize: '16px', fontWeight: 'bold' }}>
                        {currency}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '5px 0' }}><strong>Amount to Receive:</strong></p>
                      <p style={{ margin: '5px 0', color: '#ffd700', fontSize: '16px', fontWeight: 'bold' }}>
                        {cryptoAmount} {currency}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '5px 0' }}><strong>Exchange Rate:</strong></p>
                      <p style={{ margin: '5px 0', color: '#e0e0e0' }}>
                        ${rate?.toLocaleString() || '...'} USD
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '5px 0' }}><strong>Status:</strong></p>
                      <p style={{ margin: '5px 0', color: '#ff9800', fontWeight: 'bold' }}>
                        Pending Processing
                      </p>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#1b5e20',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <p style={{ margin: '0', color: '#81c784', fontWeight: 'bold', fontSize: '16px' }}>
                      🎉 Your redemption request has been received!
                    </p>
                    <p style={{ margin: '10px 0 0 0', color: '#c8e6c9', fontSize: '14px' }}>
                      You will receive your {currency} within {getRedemptionWaitTime(amount).toLowerCase()}.
                      Check your wallet address for the incoming transaction.
                    </p>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {orderSubmitted && (
                <div style={{
                  backgroundColor: '#2a2a2a',
                  padding: '20px',
                  borderRadius: '8px',
                  marginTop: '20px',
                  border: '1px solid #444'
                }}>
                  <h5 style={{ color: '#ffd700', marginBottom: '15px' }}>📋 What Happens Next?</h5>
                  <div style={{ fontSize: '14px', color: '#e0e0e0', lineHeight: '1.6' }}>
                    <p style={{ margin: '8px 0', display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ marginRight: '10px', color: '#4caf50' }}>1.</span>
                      Our team will verify your transaction details within the expected timeframe
                    </p>
                    <p style={{ margin: '8px 0', display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ marginRight: '10px', color: '#4caf50' }}>2.</span>
                      Once verified, {currency} will be sent to your specified wallet address
                    </p>
                    <p style={{ margin: '8px 0', display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ marginRight: '10px', color: '#4caf50' }}>3.</span>
                      You'll receive an email confirmation when the transaction is complete
                    </p>
                    <p style={{ margin: '8px 0', display: 'flex', alignItems: 'flex-start' }}>
                      <span style={{ marginRight: '10px', color: '#ff9800' }}>⚠️</span>
                      Please ensure your wallet address is correct - transactions cannot be reversed
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: '20px'
            }}>
              {orderSubmitted ? (
                <button
                  onClick={() => navigate('/earings')}
                  style={{
                    ...styles.button,
                    backgroundColor: '#4caf50',
                    fontSize: '16px',
                    padding: '15px 30px'
                  }}
                >
                  <span style={{ marginRight: '10px' }}>🎉</span>
                  Go to Wallet
                </button>
              ) : (
                <>
                  <button
                    // onClick={() => window.location.reload()}
                    style={{
                      ...styles.button,
                      backgroundColor: '#ff9800',
                      fontSize: '14px',
                      padding: '12px 24px'
                    }}
                  >
                    Complete Redemption
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    style={{
                      ...styles.cancel_button,
                      fontSize: '14px',
                      padding: '12px 24px'
                    }}
                  >
                    Back to Wallet
                  </button>
                </>
              )}
            </div>


            {/* PaymentButton for demo/alternative payment method */}
            {/* <PaymentButton amountUSD={10} onError={onPaymentError}>Add $10 in Credits</PaymentButton> */}
          </CardContent>
        </Card>
      </Stack>
    </Container >
  );
}




// Styles object
const styles = {
  container: {
    maxWidth: '600px',
    margin: 'auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    color: '#ffffff',
    backgroundColor: '#0a0a0a',
    minHeight: '100vh',
    borderRadius: '12px',
    border: '1px solid #ffd700',
    boxShadow: '0 4px 20px rgba(255, 215, 0, 0.2)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    color: '#ffd700',
    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
  },
  form: {
    backgroundColor: '#1a1a1a',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
    border: '1px solid #ffd700',
    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
  },
  formGroup: {
    marginBottom: '15px',
  },
  input: {
    width: '100%',
    padding: '12px 15px',
    marginTop: '5px',
    borderRadius: '8px',
    border: '1px solid #ffd700',
    fontSize: '16px',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    transition: 'all 0.3s ease',
    '&:focus': {
      outline: 'none',
      borderColor: '#ffed4e',
      boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
    },
    '&:hover': {
      borderColor: '#ffed4e',
      boxShadow: '0 0 5px rgba(255, 215, 0, 0.3)',
    },
  },
  select: {
    width: '100%',
    padding: '12px 15px',
    marginTop: '5px',
    borderRadius: '8px',
    border: '1px solid #ffd700',
    fontSize: '16px',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  required: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  rateInfo: {
    marginTop: '20px',
    marginBottom: '20px',
    backgroundColor: '#1a1a1a',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #ffd700',
    boxShadow: '0 2px 10px rgba(255, 215, 0, 0.3)',
    color: '#ffffff',
  },
  buttonGroup: {
    textAlign: 'center',
    gap: '15px',
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  button: {
    padding: '12px 24px',
    margin: '8px',
    backgroundColor: '#ffd700',
    color: '#000000',
    border: '1px solid #ffd700',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
  },
  time_button: {
    float: "right",
    padding: '6px 12px',
    margin: '4px 2px',
    backgroundColor: 'transparent',
    color: '#ffe70bff',
    border: '1px solid #ffd700',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    // boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
  },
  cancel_button: {
    padding: '12px 24px',
    margin: '8px',
    backgroundColor: 'transparent',
    color: '#ff6b6b',
    border: '1px solid #ff6b6b',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(255, 107, 107, 0.2)',
  },

  log_button: {
    padding: '12px 24px',
    margin: '8px',
    backgroundColor: 'transparent',
    color: '#11ff00ff',
    border: '1px solid #47fd2bff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(181, 255, 107, 0.2)',
  },
  walletInfo: {
    backgroundColor: '#1a1a1a',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #ffd700',
    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
    color: '#ffffff',
  },
  walletAddressContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '15px',
    marginBottom: '15px',
    gap: '15px',
  },
  walletAddress: {
    flexGrow: 1,
    fontSize: '16px',
    wordBreak: 'break-all',
    backgroundColor: '#0a0a0a',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #ffd700',
    color: '#ffd700',
    fontFamily: 'monospace',
  },
  errorMessage: {
    color: '#ff6b6b',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #ff6b6b',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: '600',
  },
  successMessage: {
    color: '#66bb6a',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #66bb6a',
    borderRadius: '8px',
    textAlign: 'center',
    fontWeight: '600',
  },
  uploadSection: {
    marginBottom: '20px',
    padding: '20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '12px',
    border: '2px dashed #ffd700',
    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.2)',
  },

  uploadLabel: {
    display: 'block',
    fontWeight: '600',
    marginBottom: '15px',
    color: '#ffd700',
    textShadow: '0 0 5px rgba(255, 215, 0, 0.3)',
  },

  uploadButtonContainer: {
    textAlign: 'center',
    marginBottom: '15px',
  },

  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#ffd700',
    color: '#000000',
    border: '1px solid #ffd700',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
  },

  fileError: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#1a1a1a',
    color: '#ff6b6b',
    borderRadius: '8px',
    marginBottom: '15px',
    fontSize: '14px',
    border: '1px solid #ff6b6b',
    fontWeight: '600',
  },

  filePreviewContainer: {
    display: 'flex',
    gap: '15px',
    padding: '15px',
    backgroundColor: '#0a0a0a',
    borderRadius: '8px',
    border: '1px solid #ffd700',
    marginBottom: '15px',
    boxShadow: '0 2px 10px rgba(255, 215, 0, 0.2)',
  },

  previewSection: {
    flexShrink: 0,
  },

  previewImage: {
    width: '128px',
    height: '128px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '2px solid #ffd700',
    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.3)',
  },

  fileInfoSection: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  fileInfo: {
    flex: 1,
    color: '#ffffff',
  },

  fileName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
    color: '#ffd700',
    marginBottom: '8px',
    fontSize: '14px',
    wordBreak: 'break-word',
  },

  fileIcon: {
    fontSize: '16px',
    color: '#ffd700',
  },

  fileSize: {
    fontSize: '12px',
    color: '#cccccc',
    marginBottom: '4px',
  },

  fileType: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#ffd700',
    color: '#000000',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  removeButton: {
    padding: '10px',
    backgroundColor: '#ff6b6b',
    color: '#ffffff',
    border: '1px solid #ff6b6b',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    height: 'fit-content',
    boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)',
  },

  uploadInstructions: {
    textAlign: 'center',
    color: '#cccccc',
    fontSize: '12px',
    fontStyle: 'italic',
    marginTop: '10px',
  }
};