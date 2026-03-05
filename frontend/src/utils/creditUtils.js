// creditUtils.js - Shared credit-related utility functions

import api from "../api/client";

const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001';

/**
 * Refund credits to a user after a failed operation
 * @param {Object} params - Refund parameters
 * @param {string} params.userId - User ID
 * @param {string} params.username - Username
 * @param {string} params.email - User email
 * @param {number} params.credits - Amount to refund
 * @param {number} params.currentCredits - User's current credit balance
 * @param {string} params.password - User password
 * @param {Object} params.params - Operation parameters (optional)
 * @returns {Promise<Object>} Response data
 */
export async function refundCredits({
  userId,
  username,
  email,
  credits,
  currentCredits,
  password,
  params = null
}) {
  try {
    const response = await api.post(`${API_URL}/api/refund-credits`, {
      userId,
      username,
      email,
      password: password || localStorage.getItem('hashedPassword'),
      credits,
      currentCredits,
      params
    });

    const data = response.data;

    if (data.success) {
      console.log(`Refund of ${credits} successful:`, data);
      return {
        success: true,
        message: `Refunded ${credits} credits successfully.`,
        data
      };
    } else {
      console.error(`Refund of ${credits} failed:`, data);
      return {
        success: false,
        message: data.message || 'Refund failed. Please contact support.',
        data
      };
    }
  } catch (err) {
    console.error("Refund request error:", err);
    return {
      success: false,
      message: 'Unable to process refund. Please contact support.',
      error: err
    };
  }
}

/**
 * Spend credits for an operation
 * @param {Object} params - Spend parameters
 * @param {string} params.username - Username
 * @param {number} params.cost - Amount to spend
 * @param {string} params.mediaType - Type of media (video/photo/audio)
 * @param {Object} params.action - Action details
 * @returns {Promise<Object>} Response data
 */
export async function spendCredits({
  username,
  cost,
  mediaType,
  action
}) {
  try {
    const response = await api.post(`${API_URL}/api/spend-credits/${username}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        cost,
        mediaType,
        action
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('Credits spent successfully:', data);
      return {
        success: true,
        message: `Successfully spent ${cost} credits!`,
        data
      };
    } else {
      console.error('Credit spending failed:', data);
      return {
        success: false,
        message: data.message || 'Credit spending failed',
        data
      };
    }
  } catch (err) {
    console.error('SpendCredits error:', err);
    return {
      success: false,
      message: 'Failed to process credits: ' + err.message,
      error: err
    };
  }
}
