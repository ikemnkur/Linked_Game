import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

export default function NavBar() {
  const navigate = useNavigate();

  const accountType = localStorage.getItem('userdata') ? JSON.parse(localStorage.getItem('userdata')).accountType : null; // 'buyer', 'seller', or null
  const userData = localStorage.getItem('userdata') ? JSON.parse(localStorage.getItem('userdata')) : null;
const token = localStorage.getItem('token');
  const loggedIn = !!accountType || !!userData || !!token; // User is logged in if accountType or token exists

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userdata');
    localStorage.removeItem('accountType');
    localStorage.setItem('reloaded_', 'false'); 
    // navigate('/login'); // Redirect to login page
    window.location.href = '/login'; // Reload to update NavBar
  }

  function handleLogin() {
    // setTimeout(() => {
    //   navigate('/login'); // Redirect to login page
    // }, 500);

    window.location.href = '/login'; // Reload to update NavBar
    
    //  
    // navigate('/login'); // Redirect to login page
  }

  return (
    <AppBar position="sticky" color="transparent" sx={{ backdropFilter: 'blur(6px)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
      <Toolbar sx={{ gap: 2 }}>
        {/* add cash register emoji to title */}
        {/* add key emoji to front of the
        title */}
          {/* todo: turn this text into a button/link while Maintaining its current style */}
        <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 800, color: 'primary.main' }}>
          <Button component={RouterLink} to="/"  sx={{ fontSize: '20px' }}>  Linx </Button>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>

          {loggedIn && <Button component={RouterLink} to="/account" color="secondary" variant="outlined">Account</Button>}
          <Button onClick={loggedIn ? handleLogout : handleLogin} color={loggedIn ? "secondary" : "primary"} variant="outlined">{loggedIn ? "Logout" : "Login"}</Button>
          {/* <Button component={RouterLink} to="/" color="secondary" variant="outlined">Main</Button> */}
          
         

          <Button component={RouterLink} to="/help" color="secondary" variant="contained">Help</Button>

        </Box>
      </Toolbar>
    </AppBar>
  );
}