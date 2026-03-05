// fetchUserData.js - Utility function to get user data from localStorage

import api from '../api/client';
import { useNavigate } from 'react-router-dom';

/**
 * Fetch user data from localStorage
 * @returns {Object|null} User data object or null if not found
 */
export async function fetchUserData() {

  const navigate = useNavigate();

  try {
    let timeout = 1500; // 1.5 seconds
    setTimeout(async () => {
      try {


        // fetch data if no data fetched before or last fetch was over 1.5 minutes ago
        // let lastDataFetchTooOld = !localStorage.getItem('lastDataFetch') ||
        //     (Date.now() - parseInt(localStorage.getItem('lastDataFetch') || "0", 10) > 1.5 * 60 * 1000);

        let userDataStr = localStorage.getItem('userdata');
        let userData = userDataStr ? JSON.parse(userDataStr) : null;

        if (!userData || !userData.username || !userData.email) {
          // throw new Error('No valid user data in localStorage');
          console.warn('No valid user data in localStorage');
        }

        console.log("Fetching user data for:", userData.username, userData.email);

        // Direct API call to JSON Server for a refresh of user data
        let response;

        response = await api.post(`api/user`, {
          username: userData.username,
          email: userData.email,
          password: localStorage.getItem('hashedPassword')
        });

        // if (response.status === 200 && response.data) {
        console.log("API user response:", response);
        response.ok && console.log("API user response OK");
        if (response.data && response.data.success) {
          console.log("User profile response data:", response.data);
          // localStorage.setItem('Earnings', JSON.stringify(response.data.earnings || []));
          // localStorage.setItem('Unlocks', JSON.stringify(response.data.unlocks || []));
          localStorage.setItem('userdata', JSON.stringify(response.data.user || {}));
          localStorage.setItem('lastDataFetch', Date.now().toString()); // Set account type

          // Store dayPass data properly (don't store null as string)
          if (response.data.dayPassExpiry) {
            localStorage.setItem('dayPassExpiry', response.data.dayPassExpiry);
          } else {
            localStorage.removeItem('dayPassExpiry');
          }

          if (response.data.dayPassMode && new Date(response.data.dayPassExpiry) > new Date()) {
            localStorage.setItem('dayPassMode', response.data.dayPassMode);
          } else {
            localStorage.setItem('dayPassMode', 'free');
          }
        } else {
          throw new Error('Failed to fetch wallet data');
        }

        return response.data ? response.data.user : null;

      } catch (e) {
        console.error('Error loading wallet balance:', e);
        // setBalance(0); // demo fallback with realistic amount
        // clear local storage
        // localStorage.clear();
        alert('Session Expired. Unable to fetch user data. Please login again.');
        navigate('/login');

        setTimeout(() => { window.location.reload(); 
            return null;
        }, 1000); // Redirect to login after 1 second

        // return {
        //   success: false,
        //   message: 'Unable to fetch user data. Please login again.',
        //   error: err
        // };
      }
    }, timeout); 


  } catch (err) {
    console.error("Error parsing user data from localStorage:", err);
    return null;
  }
}

