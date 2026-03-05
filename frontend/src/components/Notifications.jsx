import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Stack,
  Pagination,
  CircularProgress,
  Button
} from '@mui/material';
import { 
  Close,
  ShoppingCart,
  Payment,
  Key,
  Report,
  CheckCircle,
  MonetizationOn,
  Warning,
  Info
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const itemsPerPage = 5; // Smaller page size for better UX

  const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:3001';  
  // Mock notifications data for Linx app
  const generateMockNotifications = () => {
    const currentTime = new Date();
    const mockData = [
      // Key Buyer Notifications
      {
        id: 1,
        type: 'key_purchased',
        title: 'Key Purchase Successful',
        message: 'You purchased "Windows Pro License Key" for 250 credits.',
        created_at: new Date(currentTime.getTime() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        priority: 'success',
        category: 'buyer'
      },
      {
        id: 2,
        type: 'credits_purchased',
        title: 'Credits Added',
        message: 'Successfully purchased 500 credits using Bitcoin payment.',
        created_at: new Date(currentTime.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        priority: 'success',
        category: 'buyer'
      },
      {
        id: 3,
        type: 'credits_approval',
        title: 'Payment Processing',
        message: 'Your credit purchase of 1000 credits is being processed. This may take up to 24 hours.',
        created_at: new Date(currentTime.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        priority: 'info',
        category: 'buyer'
      },
      {
        id: 4,
        type: 'report_submitted',
        title: 'Report Submitted',
        message: 'Your report for "Steam Game Code" has been submitted and is under review.',
        created_at: new Date(currentTime.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        priority: 'warning',
        category: 'buyer'
      },
      // Key Seller Notifications
      {
        id: 5,
        type: 'key_sold',
        title: 'Key Sold!',
        message: 'Your "Archive Password" was purchased by user_42 for 75 credits.',
        created_at: new Date(currentTime.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        priority: 'success',
        category: 'seller'
      },
      {
        id: 6,
        type: 'key_reported',
        title: 'Key Reported',
        message: 'Your key "Game DLC Code" has been reported by a buyer. Please review.',
        created_at: new Date(currentTime.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        priority: 'warning',
        category: 'seller'
      },
      {
        id: 7,
        type: 'redemption_status',
        title: 'Key Redemption Confirmed',
        message: 'The buyer has confirmed successful redemption of "Windows Pro License Key".',
        created_at: new Date(currentTime.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        priority: 'success',
        category: 'seller'
      },
      {
        id: 8,
        type: 'credits_approved',
        title: 'Credits Approved',
        message: 'Your crypto payment has been confirmed. 1000 credits added to your account.',
        created_at: new Date(currentTime.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        priority: 'success',
        category: 'buyer'
      }
    ];
    return mockData;
  };

  // Function to get notification icon based on type
  const getNotificationIcon = (type, priority) => {
    switch (type) {
      case 'key_purchased':
      case 'key_sold':
        return <Key sx={{ color: priority === 'success' ? '#2e7d32' : '#ffd700' }} />;
      case 'credits_purchased':
      case 'credits_approved':
        return <MonetizationOn sx={{ color: '#2e7d32' }} />;
      case 'credits_approval':
        return <Payment sx={{ color: '#ff9800' }} />;
      case 'report_submitted':
      case 'key_reported':
        return <Report sx={{ color: '#f44336' }} />;
      case 'redemption_status':
        return <CheckCircle sx={{ color: '#2e7d32' }} />;
      default:
        return <Info sx={{ color: '#ffd700' }} />;
    }
  };

  // Function to fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get current user data from localStorage
      const userData = JSON.parse(localStorage.getItem("userdata") || '{"username":"user_123"}');
      const username = userData.username || 'user_123';
      
      // Fetch all notifications and filter by username
      // const response = await fetch(`${API_URL}/api/notifications`);

      const response = await api.get(`${API_URL}/api/notifications/${username}`);


      
      
      // if (!response.ok) {
      //   throw new Error(`HTTP error! status: ${response.status}`);
      // }
      
      const allNotifications = await response.data;
      
      // Filter notifications for current user
      const userNotifications = allNotifications.filter(
        notification => notification.username === username
      );
      
      // Sort by created date (newest first)
      userNotifications.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
      
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error.message);
      
      // Fallback to mock data if API fails
      const mockData = generateMockNotifications();
      setNotifications(mockData);
    } finally {
      setLoading(false);
    }
  };


  // dekete notification function
  const deleteNotifcation = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/notifications/delete/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`Notification ${id} deleted successfully.`);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  // Initialize notifications
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Handle dismiss notification
  const handleDismiss = (id) => {
    // todo: 
    deleteNotifcation(id)
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  // Handle view notification - navigate to relevant page
  const handleView = (notification) => {
    switch (notification.type) {
      case 'key_purchased':
      case 'key_sold':
        navigate('/');
        break;
      case 'credits_purchased':
      case 'credits_approval':
      case 'credits_approved':
        navigate('/purchase');
        break;
      case 'report_submitted':
      case 'key_reported':
        navigate('/help');
        break;
      case 'redemption_status':
        navigate('/wallet');
        break;
      default:
        navigate('/');
    }
  };

  // Calculate pagination values
  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  
  // Get current page notifications
  const currentNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return notifications.slice(startIndex, endIndex);
  }, [notifications, currentPage]);

  // Handle page change
  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  // Reset to first page when notifications change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [notifications.length, currentPage, totalPages]);

  // Format relative time
  const getRelativeTime = (dateString) => {
    // console.log("dateString:", dateString);
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);


    // Convert dateString to local time
    const localDate = new Date(dateString).toLocaleString();

    return localDate;

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  return (
    <Box>
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress size={24} sx={{ color: '#ffd700', mb: 1 }} />
          <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
            Loading notifications...
          </Typography>
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" sx={{ color: '#f44336', mb: 1 }}>
            Failed to load notifications
          </Typography>
          <Typography variant="caption" sx={{ color: '#b0b0b0', mb: 2, display: 'block' }}>
            {error}
          </Typography>
          <Button 
            size="small" 
            onClick={fetchNotifications}
            sx={{ 
              color: '#ffd700', 
              borderColor: '#ffd700',
              '&:hover': { backgroundColor: 'rgba(255, 215, 0, 0.1)' }
            }}
            variant="outlined"
          >
            Retry
          </Button>
        </Box>
      ) : notifications.length > 0 ? (
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <List sx={{ p: 0 }}>
            {currentNotifications.map((notif) => (
              <Paper
                key={notif.id}
                elevation={0}
                sx={{
                  mb: 1,
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: '#2a2a2a',
                    borderColor: '#ffd700'
                  }
                }}
              >
                <ListItem
                  sx={{
                    py: 1.5,
                    px: 2,
                    cursor: 'pointer'
                  }}
                  onClick={() => handleView(notif)}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getNotificationIcon(notif.type, notif.priority)}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ color: '#ffd700', fontWeight: 600 }}
                        >
                          {notif.title}
                        </Typography>
                        {/* <Chip
                          size="small"
                          label={notif.category === 'seller' ? 'Seller' : 'Buyer'}
                          sx={{
                            fontSize: '0.7rem',
                            height: 18,
                            backgroundColor: notif.category === 'seller' ? '#2e7d32' : '#1976d2',
                            color: '#fff'
                          }}
                        /> */}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'block' }}>
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: '#e0e0e0', mb: 0.5, display: 'block' }}
                        >
                          {notif.message}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ color: '#b0b0b0', display: 'block' }}
                        >
                          {getRelativeTime(notif.createdAt)}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notif.id);
                      }}
                      sx={{
                        color: '#b0b0b0',
                        '&:hover': {
                          backgroundColor: '#333',
                          color: '#ffd700'
                        }
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            ))}
          </List>
          
          {/* Pagination */}
          {notifications.length > itemsPerPage && (
            <Stack spacing={1} alignItems="center">
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                size="small"
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: '#e0e0e0',
                    borderColor: '#555',
                    '&:hover': {
                      backgroundColor: '#333'
                    },
                    '&.Mui-selected': {
                      backgroundColor: '#ffd700',
                      color: '#000'
                    }
                  }
                }}
              />
              <Typography variant="caption" sx={{ color: '#b0b0b0' }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, notifications.length)} of {notifications.length}
              </Typography>
            </Stack>
          )}
        </Stack>
      ) : (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Info sx={{ fontSize: 48, color: '#555', mb: 1 }} />
          <Typography variant="body1" sx={{ color: '#b0b0b0' }}>
            No new notifications
          </Typography>
          <Typography variant="body2" sx={{ color: '#777' }}>
            You're all caught up!
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Notifications;
