import React from 'react';
import { useEffect } from 'react';
import { Container, Typography, Button, Box, Paper, Alert } from '@mui/material';
import { Error as ErrorIcon, Refresh } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console or error reporting service
    console.error('Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    // Optionally reload the page
    window.location.reload();
  };


  hasError() {
    useEffect(() => {
      // Reset error state when the component mounts

      if ((localStorage.getItem('reloaded_') === 'false')) {
        localStorage.setItem('reloaded_', 'true');
        window.location.reload();
      }
      if ((localStorage.getItem('reloaded_') === null)) {
        localStorage.setItem('reloaded_', 'false');
      }

      // return () => {
      //   this.setState({
      //     hasError: false,
      //     error: null,
      //     errorInfo: null
      //   });
      // };
    }, []);
  }


  render() {



    if (this.state.hasError) {
      // Fallback UI


      return (
        <Container sx={{ py: 8 }}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              backgroundColor: '#424242',
              color: 'white',
              textAlign: 'center'
            }}
          >
            <ErrorIcon sx={{ fontSize: 80, color: '#f44336', mb: 2 }} />

            <Typography variant="h3" sx={{ mb: 2, fontWeight: 'bold' }}>
              Oops! Something went wrong
            </Typography>

            <Typography variant="h6" sx={{ mb: 3, color: '#e0e0e0' }}>
              We apologize for the inconvenience. An unexpected error occurred.
            </Typography>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {this.state.error && this.state.error.toString()}
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleReset}
                sx={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  fontWeight: 'bold',
                  px: 4,
                  py: 1.5
                }}
              >
                Reload Page
              </Button>


              <Button
                variant="outlined"
                onClick={() => window.location.href = '/'}
                sx={{
                  borderColor: '#22d3ee',
                  color: '#22d3ee',
                  px: 4,
                  py: 1.5
                }}
              >
                Go to Home
              </Button>
            </Box>

            {/* Show stack trace in development mode */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Box sx={{ mt: 4, textAlign: 'left' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#ff9800' }}>
                  Error Details (Development Mode)
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: '#1e1e1e',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}
                >
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: '#f44336',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Paper>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
