// require('dotenv').config();
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PhotoCamera } from '@mui/icons-material';
import { QrCode } from '@mui/icons-material';

import { Container, Stack, Typography, Card, CardContent, Divider, Skeleton } from '@mui/material';
import api from '../api/client';
import { uploadTransactionScreenshot } from '../api/api';
import { useToast } from '../contexts/ToastContext';
import axios from 'axios';
// import dotenv from 'dotenv';


// dotenv.config();



const BLOCKCHAIR_API_KEY = import.meta.env.VITE_BLOCKCHAIR_API_KEY;
const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001';
export default function Purchase() {



  const promoPackagesMap = [
    { amount: 2000, price: 2.5, popular: false },
    { amount: 5000, price: 5, popular: false },
    { amount: 12500, price: 11, popular: true },
    { amount: 25000, price: 24, popular: false },
    { amount: 55000, price: 53, popular: false },
    { amount: 120000, price: 115, popular: false },
  ];


  const [balance, setBalance] = useState(null);
  const { success, error } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const initialAmount = query.get('amount') || 12500; // Default to most popular
  const [amount, setAmount] = useState(initialAmount);
  const [price, setPrice] = useState(11);
  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem("userdata")));

  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [currency, setCurrency] = useState('BTC'); // Default currency
  const [rate, setRate] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState(''); // For success messages
  // const [walletAddress, setWalletAddress] = useState('YOUR_WALLET_ADDRESS_HERE');
  const [userDetails, setUserDetails] = useState({
    name: '',
    email: '',
    walletAddress: '',
    key: '',
    transactionId: '',
    time: ''
  });

  const [txFile, setTXFile] = useState(null);
  const [cashAppTag, setCashAppTag] = useState('$YourCashAppTag');
  // const [filePreview, setFilePreview] = useState(null);
  // const [fileError, setFileError] = useState('');


  // Calculate the amount in USD and crypto
  const dollarValueOfCoins = price; // Assuming 1000 coins = $1
  const cryptoAmount = rate ? (dollarValueOfCoins / rate).toFixed(8) : '0.00000000'; // Amount of crypto to send


  const load = async () => {
    try {
      // const { data } = await api.post(`/api/wallet/balance/${userData.username}`, {Password: userData.password, email: userData.email});
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
      const fallbackRates = { BTC: 45000, ETH: 3000, LTC: 100, SOL: 50, XMR: 150, XRP: 0.5 };
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

  const handleBuyCredits = (packageAmount, packagePrice) => {
    setAmount(packageAmount);
    console.log("Selected package:", packageAmount, "Price:", packagePrice);
    setPrice(packagePrice);
    // Optionally scroll to next step or highlight it
    document.querySelector('[data-step="3"]')?.scrollIntoView({ behavior: 'smooth' });
  };

  // const handleCancelOrder = () => {
  //   // Navigate back to dashboard or previous page
  //   navigate('/wallet'); // Adjust the path as needed
  // };

  const handleCopyAddress = () => {
    const walletAddress = cashAppTag || 'YOUR_WALLET_ADDRESS_HERE';
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

  // Example function to upload file to backend:
  const uploadToBackend = async (file, username, transactionHash) => {
    const formData = new FormData();
    formData.append('media', file);
    formData.append('username', username);
    formData.append('transactionHash', transactionHash);

    try {
      // uploadMediaFiles should return the media link or an object with mediaLink property
      const response = await uploadTransactionScreenshot(formData, username, transactionHash);
      console.log('Transaction screenshot file uploaded:', response);

      // If your backend returns { mediaLink: "..." }
      if (response && response.url) {
        return response.url;
      }
      // If your backend returns { mediaLink: "..." }
      if (response && response.mediaLink) {
        return response.mediaLink;
      }
      // If your backend returns the link directly
      if (typeof response === 'string') {
        return response;
      }
      throw new Error('Upload failed or invalid response');
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // Enhanced screenshot upload handler
  const handleScreenshotUploadStep1 = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // File type validation
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Please upload only PNG or JPG files.');
      setUploadedFile(null);
      setFilePreview(null);
      return;
    }

    // File size validation (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setFileError('File size must be less than 5MB.');
      setUploadedFile(null);
      setFilePreview(null);
      return;
    }

    // Clear any previous errors
    setFileError('');
    setUploadedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);

    setTXFile(file);

    // // Store file info for later use
    // const fileInfo = {
    //   name: file.name,
    //   size: file.size,
    //   type: file.type,
    //   lastModified: file.lastModified,
    //   timestamp: Date.now(),
    //   userId: ud?.user_id || ud?.id || 'unknown'
    // };

    // // In a real app, you would upload to backend here
    // console.log('Screenshot uploaded:', fileInfo);
    // setMessage('Screenshot uploaded successfully!');

    // // Upload logic (if you want to upload immediately)
    // const formData = new FormData();
    // formData.append('screenshot', file);
    // formData.append('username', userData.username);
    // formData.append('userId', userData.user_id || userData.id);
    // formData.append('time', new Date().toISOString().split('T')[1]);
    // formData.append('date', new Date().toISOString());

    // try {
    //   let mediaLink;

    //   mediaLink = await uploadToBackend(file, ud?.username || 'anonymous', userDetails.transactionHash); // server returns { mediaLink }
    //   formData.append('mediaLink', mediaLink);

    //   setMessage('Screenshot uploaded successfully!');

    // } catch (error) {
    //   console.error('API - Error uploading screenshot:', error);
    //   setFileError('An error occurred while uploading the image.');
    // }
  };


  // Enhanced screenshot upload handler
  const handleScreenshotUploadStep2 = async () => {

    const file = txFile;

    // Upload logic (if you want to upload immediately)
    const formData = new FormData();
    formData.append('screenshot', file);
    formData.append('username', userData.username);
    formData.append('userId', userData.user_id || userData.id);
    formData.append('time', new Date().toISOString().split('T')[1]);
    formData.append('date', new Date().toISOString());

    try {
      let mediaLink;

      mediaLink = await uploadToBackend(file, ud?.username || 'anonymous', userDetails.transactionId); // server returns { mediaLink }

      formData.append('mediaLink', mediaLink);

      setMessage('Screenshot uploaded successfully!');

    } catch (error) {
      console.error('API - Error uploading screenshot:', error);
      setFileError('An error occurred while uploading the image.');
    }
  };


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
  const [transactionStatus, setTransactionStatus] = useState('pending'); // pending, validating, confirmed, failed
  const [validationMessage, setValidationMessage] = useState('');
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

      api.post(`/api/purchases/${ud?.username || 'anonymous'}`,
        { data: data }
      )
        .then(() => {
          setMessage(`Order submitted successfully! ${enableOrderLogging ? 'Order logged with user tracking.' : 'Processing without logging.'} Please wait for confirmation.`);
          setOrderSubmitted(true);
          setErrorMessage('');
        })
        .catch((error) => {
          console.error('Error submitting order:', error);
          setErrorMessage('An error occurred. Please try again.');
        });

      // handleScreenshotUploadStep2();

      // Scroll to Step 5
      setTimeout(() => {
        document.querySelector('[data-step="5"]')?.scrollIntoView({ behavior: 'smooth' });
      }, 1000);

    } catch (error) {
      console.error('Error submitting order:', error);
      setErrorMessage('An error occurred. Please try again.');
    }
  };


  async function lookupTransactionOnServer(sendAddress, blockchain, transactionHash) {
    try {
      console.log('Verifying transaction on server:', { sendAddress, blockchain, transactionHash });
      const response = await api.post(`api/lookup-transaction`, {
        sendAddress,
        blockchain,
        transactionHash
      });

      console.log('Server lookup response data:', response.data);

      return response.data; // Expected to contain { found: boolean, details: {...} }
    } catch (error) {
      console.error('Error verifying transaction on server:', error);
      return { found: false };
    }
  }

  // // --- Helper function to fetch all transactions for an address and filter by date ---
  async function getAllTransactionsForLastHour(depositAddress, blockchain) {
    let allTransactions = [];
    let offset = 0;
    const limit = 10;
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 4); // or use 1 hour if desired

    while (true) {

      const url = `https://api.blockchair.com/${blockchain}/dashboards/address/${depositAddress}?transaction_details=true&limit=${limit}&offset=${offset}`;

      try {
        const response = await axios.get(url);
        const data = response.data;

        if (!data?.data?.[depositAddress]?.transactions) {
          console.warn(`Blockchair API response for ${depositAddress} was incomplete or empty.`);
          break;
        }

        const fetchedTransactions = data.data[depositAddress].transactions;

        console.log(
          "Current balance:",
          data.data[depositAddress].address.balance / 1e8,
          blockchain.toUpperCase()
        );
        console.log(`Fetched ${fetchedTransactions.length} transactions from Blockchair for ${depositAddress} at offset ${offset}`);

        if (fetchedTransactions.length === 0) break;

        // Filter transactions by time
        const recentTransactions = fetchedTransactions.filter(tx => {
          const txDate = new Date(tx.time);
          return txDate >= oneHourAgo;
        });

        allTransactions.push(...recentTransactions);

        // Stop if we’ve reached the end
        if (fetchedTransactions.length < limit || recentTransactions.length < fetchedTransactions.length) {
          break;
        }

        offset += limit;
      } catch (error) {
        console.error(`Error fetching transactions from Blockchair for ${depositAddress}:`, error.response?.data || error.message);
        break;
      }
    }

    return allTransactions;
  }


  async function getTransactionDetails(time, cryptoAmount, senderAddresses, depositAddress, blockchain) {
    try {
      // fetch transsaction from blockchair from the deposit address
      const url = `https://api.blockchair.com/${blockchain}/dashboards/address/${depositAddress}?transaction_details=true`;
      const response = await axios.get(url);
      const data = response.data;

      if (!data || !data.data || !data.data[depositAddress] || !data.data[depositAddress].transactions) {
        console.error(`No transaction data found for ${depositAddress}`);
        return null;
      }

      // Find transactions that match the time and sender address
      const matchingTxs = data.data[depositAddress].transactions.filter(tx => {
        const txDate = new Date(tx.time);
        const inputAddresses = tx.inputs.map(input => input.recipient);
        const timeMatch = Math.abs(txDate - new Date(time)) < 15 * 60 * 1000; // within 15 minutes
        const senderMatch = senderAddresses.some(addr => inputAddresses.includes(addr));
        return timeMatch && senderMatch;
      });

      if (matchingTxs.length === 0) {
        console.warn(`No matching transactions found for ${depositAddress} at specified time and sender addresses.`);
        return null;
      }

      // Further filter by amount received
      for (const tx of matchingTxs) {
        const receivedOutputs = tx.outputs.filter(output => output.recipient === depositAddress);
        const totalReceived = receivedOutputs.reduce((sum, output) => sum + output.value, 0);
        const amountInCrypto = totalReceived / 100000000; // Convert satoshis to main currency

        if (Math.abs(amountInCrypto - cryptoAmount) < 0.01) { // small tolerance
          return {
            hash: tx.hash,
            time: tx.time,
            block: tx.block_id,
            confirmations: tx.confirmations || 0,
            amountReceived: amountInCrypto,
            amountReceivedSatoshis: totalReceived,
            senderAddresses: senderAddresses,
            outputs: receivedOutputs
          };
        }
      }

      console.warn(`No transactions matched the expected amount for ${depositAddress}.`);
      return null;

    } catch (error) {
      console.error(`Error fetching transaction details for ${depositAddress}:`, error.message);
      return null;
    }
  }




  // Main transaction checking function
  async function checkTransaction() {
    const transactionId = userDetails.transactionId?.trim();
    const senderWalletAddr = userDetails.walletAddress?.trim(); // User's sending wallet
    const expectedAmount = parseFloat(cryptoAmount);
    const curr = currency;

    try {
      // Validate inputs
      if (!transactionId || !senderWalletAddr || !expectedAmount || !curr) {
        throw new Error('Please fill in all required fields');
      }

      // Get deposit info for this currency
      const depositInfo = depositWalletAddressMap[curr];
      if (!depositInfo) {
        throw new Error('Unsupported cryptocurrency');
      }

      // Check if user entered our deposit address by mistake
      if (senderWalletAddr === depositInfo.address) {
        setTransactionStatus('failed');
        setValidationMessage(
          `The wallet address you entered is our deposit address. Please enter the address you sent FROM.`
        );
        return false;
      }

      console.log(`\n=== Verifying Payment ===`);
      console.log(`Checking transactions to: ${depositInfo.address}`);
      console.log(`Expected from: ${senderWalletAddr}`);
      console.log(`Transaction ID: ${transactionId}`);
      // console.log(`Expected amount: ${expectedAmount} ${curr}\n`);




      let transactionLookup;

      try {
        console.log('Verifying transaction on server:', { senderWalletAddr, currency, transactionId });
        const response = await api.post(`/api/lookup-transaction`, {
          sendAddress: senderWalletAddr,
          blockchain: currency,
          transactionHash: transactionId
        });

        transactionLookup = response.data;

        // console.log('Server lookup response data:', response.data);

        // return response.data; // Expected to contain { found: boolean, details: {...} }
      } catch (error) {
        console.error('Error verifying transaction on server:', error);
        // return { found: false };
      }

      console.log('Server lookup response:', transactionLookup);

      // await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for readability

      // Use optional chaining in case the server returned null/undefined or a malformed response
      if (transactionLookup?.found) {
        console.log('Transaction found via server lookup:', transactionLookup.details);
        // You can add additional verification here if needed
        setTransactionStatus('confirmed');

        // Safely read amountReceived with a fallback
        const receivedAmount = transactionLookup?.details?.amountReceived ?? 'unknown amount';

        setValidationMessage(
          `✅ Payment verified via server lookup! Received ${receivedAmount} ${curr}.`
        );
        console.log('Transaction was found via server lookup and is considered valid.');
        console.log(`Block Explorer: https://blockchair.com/${depositInfo.blockchain}/transaction/${transactionId}`);
        return true;
      } else {
        console.log('Transaction not found via server lookup, proceeding with direct blockchain check.');
      }

      // // if we reach here, server lookup did not find the transaction

      // // CRITICAL FIX: Check transactions to YOUR deposit address, not user's wallet
      // const transactions = await getAllTransactionsForLastHour(
      //   depositInfo.address,  // Check YOUR deposit address
      //   depositInfo.blockchain
      // );

      // console.log(`\nFound ${transactions.length} recent transaction(s) to deposit address\n`);

      // // Find the specific transaction by hash
      // const matchingTx = transactions.find(tx => tx.hash === transactionId);

      // if (!matchingTx) {
      //   setTransactionStatus('failed');
      //   setValidationMessage(
      //     `Transaction ${transactionId} not found in recent transactions to our deposit address.`
      //   );
      //   return false;
      // }

      // // Get detailed transaction info
      // const details = await getTransactionDetails(
      //   userDetails.time,
      //   expectedAmount,
      //   [senderWalletAddr],
      //   depositInfo.address,  // Check amount received at YOUR address
      //   depositInfo.blockchain
      // );



      // // const details = await getTransactionDetails(
      // //   matchingTx.hash, 
      // //   depositInfo.address,  // Check amount received at YOUR address
      // //   depositInfo.blockchain
      // // );

      // if (!details) {
      //   setTransactionStatus('failed');
      //   setValidationMessage('Unable to fetch transaction details.');
      //   return false;
      // }

      // // Display transaction details
      // console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      // console.log(`Transaction Hash: ${details.hash}`);
      // console.log(`Time: ${details.time}`);
      // console.log(`Confirmations: ${details.confirmations}`);
      // console.log(`Amount Received: ${details.amountReceived} ${curr}`);
      // console.log(`Sender Address(es): ${details.senderAddresses.join(', ')}`);

      // console.log('TX details:', details);

      // // Verify the sender wallet matches
      // const senderMatches = details.senderAddresses.includes(senderWalletAddr);
      // console.log(`Sender Match: ${senderMatches ? '✅ YES' : '❌ NO'}`);

      // // Verify the amount matches (with small tolerance for rounding)
      // const amountMatches = Math.abs(details.amountReceived - expectedAmount) < 0.01;
      // console.log(`Expected Amount: ${expectedAmount} ${curr}`);
      // console.log(`Amount Match: ${amountMatches ? '✅ YES' : '❌ NO'}`);

      // // Check minimum confirmations (optional - adjust as needed)
      // const hasEnoughConfirmations = details.confirmations >= 1; // At least 1 confirmation
      // console.log(`Confirmations Check: ${hasEnoughConfirmations ? '✅ YES' : '⚠️ UNCONFIRMED'}`);

      // console.log(`Block Explorer: https://blockchair.com/${depositInfo.blockchain}/transaction/${details.hash}`);
      // console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // // Verify all conditions
      // if (senderMatches && amountMatches && hasEnoughConfirmations) {
      //   setTransactionStatus('confirmed');
      //   setValidationMessage(
      //     `✅ Payment verified! Received ${details.amountReceived} ${curr} with ${details.confirmations} confirmation(s).`
      //   );
      //   return true;
      // } else {
      //   // Provide specific failure reason
      //   let reason = '';
      //   if (!senderMatches) reason = 'Sender address does not match.';
      //   else if (!amountMatches) reason = `Amount mismatch. Received: ${details.amountReceived} ${curr}, Expected: ${expectedAmount} ${curr}`;
      //   else if (!hasEnoughConfirmations) reason = 'Transaction not yet confirmed on blockchain.';

      setTransactionStatus('failed');
      setValidationMessage(`Verification failed: ${reason}`);
      return false;
      // }

    } catch (error) {
      console.error('Transaction verification error:', error);
      setTransactionStatus('failed');
      setValidationMessage(error.message || 'Verification error');
      return false;
    }
  }

  const handleValidateTransaction = async (e) => {
    e.preventDefault();
    if (!userDetails.transactionId.trim()) {
      setValidationMessage('Please enter a transaction ID to validate.');
      return;
    }

    setTransactionStatus('validating');
    setValidationMessage('Checking transaction on blockchain...');

    try {
      // API call to validate transaction
      // Implementation would check the blockchain

      const isValid = await checkTransaction();

      if (isValid) {
        success('Transaction validated successfully!');
        handleOrderSubmit(new Event('submit')); // Proceed to submit order
        handleScreenshotUploadStep2();
      } else {
        error('Transaction validation failed. Please check the details and try again.');
      }

    } catch (err) {
      setTransactionStatus('failed');
      setValidationMessage('Error validating transaction. Please try again later.');
      error('Validation error occurred');
    }
  };

  const getExpectedWaitTime = (currency) => {
    const waitTimes = {
      BTC: '10-30 minutes (1-3 confirmations)',
      ETH: '5-15 minutes (12-35 confirmations)',
      LTC: '5-15 minutes (6 confirmations)',
      SOL: '1-3 minutes (32 confirmations)',
      // XMR: '20-40 minutes (10 confirmations)',
      // XRP: '5-10 minutes (1 confirmation)'
    };
    return waitTimes[currency] || '10-30 minutes';
  };

  const onPaymentError = () => error('Payment could not be started');



  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4" color="secondary.main">Purchase Credits</Typography>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6">Current Balance</Typography>
            {balance === null ? (
              <Skeleton variant="text" width={220} height={54} />
            ) : (
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>{balance} credits</Typography>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="h4">Step 1</Typography>
            <Typography variant="h6">Purchase Credits</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              Select an amount of credits to purchase. Current selection: <strong>{parseInt(amount).toLocaleString()} credits</strong>
            </Typography>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              {[
                { amount: 2000, price: 2.5, popular: false },
                { amount: 5000, price: 5.25, popular: false },
                { amount: 12500, price: 11, popular: true },
                { amount: 25000, price: 24, popular: false },
                { amount: 55000, price: 53, popular: false },
                { amount: 120000, price: 115, popular: false },
              ].map((package_, index) => (
                <div
                  key={index}
                  style={{
                    background: package_.popular
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : amount == package_.amount
                        ? 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)'
                        : 'rgba(255, 255, 255, 0.1)',
                    color: package_.popular || amount == package_.amount ? 'white' : 'rgba(255, 255, 255, 0.9)',
                    padding: '24px',
                    borderRadius: '16px',
                    border: amount == package_.amount ? '3px solid #ffd700' : package_.popular ? 'none' : '2px solid rgba(255, 255, 255, 0.2)',
                    textAlign: 'center',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: amount == package_.amount ? '0 0 25px rgba(255, 215, 0, 0.4)' : '0 4px 15px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = amount == package_.amount ? '0 0 25px rgba(255, 215, 0, 0.4)' : '0 4px 15px rgba(0,0,0,0.1)';
                  }}
                  onClick={() => handleBuyCredits(package_.amount, package_.price)}
                >
                  {package_.popular && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#f59e0b',
                      color: 'white',
                      padding: '4px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      MOST POPULAR
                    </div>
                  )}

                  {amount == package_.amount && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '20px',
                      background: '#4caf50',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      SELECTED
                    </div>
                  )}

                  <div style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    {package_.amount.toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    opacity: 0.8,
                    marginBottom: '16px'
                  }}>
                    Credits
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    ${package_.price} USD
                  </div>

                  <button style={{
                    width: '100%',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    backgroundColor: amount == package_.amount ? '#4caf50' : package_.popular ? 'rgba(255, 255, 255, 0.2)' : '#667eea',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'opacity 0.3s ease'
                  }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                  >
                    {amount == package_.amount ? 'Selected' : 'Select Package'}
                  </button>
                </div>
              ))}
            </div>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h4" data-step="3">Step 2</Typography>
            <Typography variant="h6">Send Cryptocurrency</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              Send the exact amount of money to the Cashapp Tag below.
            </Typography>

            <div style={styles.header}>
              <h2>You are buying: {parseInt(amount).toLocaleString()} Credits</h2>
              <h3>Total: ${((price) || 0).toFixed(2)} USD</h3>
            </div>

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
                color: 'white',
                flexDirection: 'column',
                display: 'flex',
                alignItems: 'center'
              }}>
                {/* Display cashapp tag qr code */}
                <h4 style={{ marginBottom: '5px' }}>CashApp Tag QR Code</h4>
                <QrCode style={{ fontSize: 32, margin: 5 }} />
                <img src="./public/CashappQR.jpg" alt="" style={{ width: "90%", margin: "0px 10px" }} />
              </div>

              <div style={{
                backgroundColor: '#1a1a1a',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #ffd700',
                marginBottom: '20px'
              }}>
                <h4 style={{ color: '#ffd700', marginBottom: '15px', textAlign: 'center' }}>
                  Payment Instructions
                </h4>
                <p style={{ marginBottom: '15px', textAlign: 'center' }}>
                  Please send <strong style={{ color: '#ffd700' }}>{price} USD</strong> to the following CashApp Tag:
                </p>


                <div style={styles.walletAddressContainer}>
                  <p style={{ ...styles.walletAddress, fontSize: '18px', fontWeight: 'bold' }}>
                    {price} USD
                  </p>
                  <button style={styles.button} onClick={handleCopyAmount}>
                    Copy Amount
                  </button>
                </div>

                <div style={styles.walletAddressContainer}>
                  <p style={styles.walletAddress}>{cashAppTag}</p>
                  <button style={styles.button} onClick={handleCopyAddress}>
                    Copy Tag
                  </button>
                </div>


              </div>
            </div>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h4">Step 3</Typography>
            <Typography variant="h6">Log Transaction Details</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              After sending a payment with Cashapp, please fill out the form below to log your order.
              Fields marked with <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>*</span> are required.
            </Typography>

            <form onSubmit={handleOrderSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <p style={{ marginBottom: '20px', textAlign: 'center', color: '#ffd700' }}>
                  After sending <strong>{cryptoAmount} {currency}</strong> to wallet: {cashAppTag.slice(0, 20)}...
                  <br />Fill out the form below to log your order for manual review.
                </p>
              </div>

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
                  Your CashApp User Tag/Name:<span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="cashappTag"
                  value={userDetails.cashappTag}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Amount Sent ($USD):</label>
                <input
                  type="text"
                  name="transactionId"
                  placeholder="e.g. 10.00"
                  value={userDetails.transactionId}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Date of Payment:</label>
                <input
                  type="date"
                  name="date"
                  value={userDetails.date}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label>Time of Payment (HH:MM AM/PM):</label>
                <input
                  type="text"
                  name="time"
                  placeholder="e.g. 09:30 AM"
                  value={userDetails.time}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label>Transaction Receipt:<span style={styles.required}>*</span></label>
                <input
                  type="text"
                  name="transactionId"
                  value={userDetails.transactionId}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="Enter the a link to the web receipt of the transaction"
                />
                <small style={{ color: '#cccccc', fontSize: '12px' }}>
                  Details from your CashApp Web receipt or transaction confirmation
                </small>
              </div>


              {/* Optional */}
              <div>
                <h3 style={{ marginTop: '30px', marginBottom: '10px' }}>Optional Details</h3>
                <p style={{ marginBottom: '20px', color: '#aaaaaa', fontSize: '14px' }}>
                  Providing additional details can help us verify your transaction way faster, but it's not required.
                </p>
              </div>





              <div style={styles.formGroup}>
                <label>Share Cash App Transaction Link (optional):</label>
                <input
                  type="url"
                  name="blockExplorerLink"
                  value={userDetails.blockExplorerLink}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="https://cash.app/..."
                />
                <small style={{ color: '#cccccc', fontSize: '12px' }}>
                  Link to view your transaction on a block explorer
                </small>
              </div>


              {/* // Replace the upload section in your JSX with this enhanced version: */}
              <div style={styles.uploadSection}>
                <label style={styles.uploadLabel}>
                  Payment Screenshot (Optional):
                </label>

                {/* Upload Button */}
                <div style={styles.uploadButtonContainer}>
                  <input
                    accept=".png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                    id="transaction-screenshot-upload"
                    type="file"
                    onChange={handleScreenshotUploadStep1}
                  />
                  <label htmlFor="transaction-screenshot-upload">
                    <button
                      type="button"
                      style={styles.uploadButton}
                      onClick={() => document.getElementById('transaction-screenshot-upload').click()}
                    >
                      <PhotoCamera style={{ marginRight: '8px', fontSize: '20px' }} />
                      {uploadedFile ? 'Change Screenshot' : 'Upload Screenshot'}
                    </button>
                  </label>
                </div>

                {/* Error Message */}
                {fileError && (
                  <div style={styles.fileError}>
                    <span>⚠️</span> {fileError}
                  </div>
                )}

                {/* File Preview and Info */}
                {uploadedFile && (
                  <div style={styles.filePreviewContainer}>
                    {/* Preview Image */}
                    <div style={styles.previewSection}>
                      <img
                        src={filePreview}
                        alt="Payment screenshot preview"
                        style={styles.previewImage}
                      />
                    </div>

                    {/* File Info */}
                    <div style={styles.fileInfoSection}>
                      <div style={styles.fileInfo}>
                        <div style={styles.fileName}>
                          <span style={styles.fileIcon}>📎</span>
                          <span>{uploadedFile.name}</span>
                        </div>
                        <div style={styles.fileSize}>
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </div>
                        <div style={styles.fileType}>
                          {uploadedFile.type.split('/')[1].toUpperCase()}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        style={styles.removeButton}
                      >
                        <span>🗑️</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Instructions */}
                <div style={styles.uploadInstructions}>
                  <small>
                    📸 Upload a screenshot of your payment confirmation (PNG or JPG only, max 5MB)
                  </small>
                </div>
              </div>


            </form>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h4" data-step="5">Step 4</Typography>
            <Typography variant="h6">Log Transaction</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              {orderSubmitted
                ? 'Your order has been logged. Use the tools below to check your transaction status.'
                : 'After submitting your order details, you can validate your transaction here.'
              }
            </Typography>


            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>

              <>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    ...styles.button,
                    backgroundColor: '#ff9800',
                    fontSize: '14px',
                    padding: '12px 24px'
                  }}
                >
                  Submit Purchase Details
                </button>

                <button
                  onClick={() => navigate('/wallet')}
                  style={{
                    ...styles.cancel_button,
                    fontSize: '14px',
                    padding: '12px 24px'
                  }}
                >
                  Go back to Wallet
                </button>
              </>

            </div>

            {/* PaymentButton for demo/alternative payment method */}
            {/* <PaymentButton amountUSD={10} onError={onPaymentError}>Add $10 in Credits</PaymentButton> */}
          </CardContent>
        </Card>
      </Stack>
    </Container>
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