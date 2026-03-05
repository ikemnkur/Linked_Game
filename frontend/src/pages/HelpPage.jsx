import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Card,
  CardContent,
  InputAdornment,
  Divider,
  Alert
} from '@mui/material';
import {
  ExpandMore,
  Help,
  Support,
  Search,
  ContactSupport,
  LiveHelp,
  Security,
  AccountCircle,
  Payment,
  Warning,
  Info as InfoIcon
} from '@mui/icons-material';
// import { fetchUserProfile } from './api';

const HelpPage = () => {
  const navigate = useNavigate();

  // Component state
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [userData, setUserData] = useState({});

  // Support modal state
  const [openSupportModal, setOpenSupportModal] = useState(false);
  const [supportProblemType, setSupportProblemType] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportTitle, setSupportTitle] = useState('');
  const [supportContactInfo, setSupportContactInfo] = useState('');

  // FAQ search and filtering
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedAccordion, setExpandedAccordion] = useState(false);

  // Initialize component - set loading to false since we don't need to load external data
  useEffect(() => {
    // Get user data from localStorage if available
    const storedUserData = localStorage.getItem('userdata');
    if (storedUserData) {
      try {
        const parsedData = JSON.parse(storedUserData);
        setUserData(parsedData);
        setProfile(parsedData);
      } catch (err) {
        console.error('Error parsing stored user data:', err);
      }
    }
    
    // Set loading to false since this page doesn't require external API calls
    setIsLoading(false);
  }, []);

  // // Load user profile
  // useEffect(() => {
  //   const loadUserProfile = async () => {
  //     try {
  //       const profileRes = await fetchUserProfile();
  //       setProfile(profileRes);
  //       const updatedUserData = {
  //         ...profileRes,
  //         birthDate: profileRes.birthDate ? profileRes.birthDate.split('T')[0] : '',
  //       };
  //       setUserData(updatedUserData);
  //       localStorage.setItem('userdata', JSON.stringify(updatedUserData));
  //     } catch (err) {
  //       console.error('Error fetching user profile:', err);
  //       setSnackbarMessage('Failed to load user profile');
  //       setOpenSnackbar(true);
  //       if (err.response?.status === 401) {
  //         setTimeout(() => navigate('/login'), 500);
  //       }
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   loadUserProfile();
  // }, [navigate]);

  // FAQ categories and data
  const faqCategories = [
    { id: 'all', label: 'All Categories', icon: <Help /> },
    { id: 'account', label: 'Account & Tiers', icon: <AccountCircle /> },
    { id: 'payment', label: 'Payments & Coins', icon: <Payment /> },
    { id: 'security', label: 'Security & Safety', icon: <Security /> },
    { id: 'content', label: 'Content & Rules', icon: <InfoIcon /> },
    { id: 'support', label: 'Support & Issues', icon: <ContactSupport /> }
  ];

  const faqData = [
    {
      category: 'account',
      question: 'What are the account tiers and their features?',
      answer: 'Account tiers help allocate site and server resources for stable operation. Each tier offers different features and limitations.',
      details: (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Tier</strong></TableCell>
              <TableCell><strong>Features</strong></TableCell>
              <TableCell><strong>Limits</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Free Tier</TableCell>
              <TableCell>Basic features, Video and Photo scrambling </TableCell>
              <TableCell>Standard upload limits, large watermarks</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Basic Tier</TableCell>
              <TableCell>Basic features, plus the Audio Scrambler </TableCell>
              <TableCell>Standard upload size limits, Watermarks</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Standard Tier</TableCell>
              <TableCell>Enhanced features, HD Photo and Video uploads</TableCell>
              <TableCell>Lite WaterMarks, Larger upload size limits/</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Premium Tier</TableCell>
              <TableCell>Premium features, 2K/4K content uploads, leak prevention</TableCell>
              <TableCell>Artifacts instead of watermarks, priority queue</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    },
    {
      category: 'account',
      question: 'Can I change my account tier?',
      answer: 'Yes, you can upgrade to a different tier, at any time. Downgrades take effect after your current billing cycle ends, if you cancel the subscription via Stripe.'
    },
    {
      category: 'payment',
      question: 'How do I buy more coins?',
      answer: 'You can purchase coins through the dashboard using various payment methods/services, stripe, bitcoin, cashapp and more.'
    },
    {
      category: 'payment',
      question: 'Can I earn credits?',
      answer: 'You can earn commissions based on how many users you unscramble your content on the site.'
    },
    {
      category: 'payment',
      question: 'Can I earn Free or Bonus Credits?',
      answer: 'You can earn bonus credit by watching an advertisement or completing special offers, on the Bonus Credits page.'
    },
    // {
    //   category: 'security',
    //   question: 'Should I trust other users on the site?',
    //   answer: 'No, always verify outside the app that the person is who they say they are. Be cautious of impersonation and scams.'
    // },
    // {
    //   category: 'security',
    //   question: 'How can I avoid being scammed?',
    //   answer: 'Always verify users outside the app, start with small transactions, and report suspicious behavior immediately.'
    // },
    // {
    //   category: 'security',
    //   question: 'What should I do if I\'ve been scammed?',
    //   answer: 'Create a support ticket immediately and include evidence of the scam so we can investigate. For large transactions, refunds may be possible with a penalty for conflict resolution.'
    // },
    {
      category: 'content',
      question: 'What type of content can I create?',
      answer: 'You can scramble any digital content, but avoid anything illegal, child content, extreme gore, or uncivil content.'
    },
    {
      category: 'content',
      question: 'If I delete content, does my rating change?',
      answer: 'Deleting content may affect your rating depending on user feedback and the reason for deletion.'
    },
    {
      category: 'support',
      question: 'How can my account be banned or restricted?',
      answer: 'Accounts/IPs can be banned/blocked for attempts to spam/scam, leak content, hacking, and doing things to sabotage or to cause glitching of the site. Restrictions occur from frequent reports made by users.'
    },
    {
      category: 'support',
      question: 'When are accounts deleted?',
      answer: 'Accounts are deleted after 90 days of inactivity, failing captchas repeatedly, or by engaging in suspicious accounts activity/causing site instability/glitching.'
    }
  ];

  // Filter FAQs based on search and category
  const filteredFaqs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Modal handlers
  const handleOpenSupportModal = () => setOpenSupportModal(true);
  const handleCloseSupportModal = () => {
    setOpenSupportModal(false);
    setSupportProblemType('');
    setSupportTitle('');
    setSupportMessage('');
    setSupportContactInfo('');
  };

  // Submit support ticket
  const handleSubmitSupportTicket = () => {
    console.log('Submitting support ticket:', {
      supportProblemType,
      supportTitle,
      supportMessage,
      supportContactInfo,
    });
    handleCloseSupportModal();
    setSnackbarMessage('Support ticket submitted successfully!');
    setOpenSnackbar(true);
  };

  // Accordion handler
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        mt: 4,
        minHeight: '50vh',
        backgroundColor: '#0a0a0a'
      }}>
        <CircularProgress sx={{ color: '#ffd700' }} size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        mt: 4,
        minHeight: '50vh',
        backgroundColor: '#0a0a0a'
      }}>
        <Typography 
          color="error"
          sx={{ 
            color: '#ff6b6b',
            fontSize: '1.2rem',
            textAlign: 'center'
          }}
        >
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, md: 4 }, 
      maxWidth: '1200px', 
      mx: 'auto',
      minHeight: '100vh',
      backgroundColor: '#0a0a0a', // Deep black background
      color: '#ffffff' // White text
    }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 700,
            color: '#ffd700', // Gold color
            mb: 2,
            textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
          }}
        >
          <LiveHelp sx={{ 
            fontSize: '2.5rem', 
            mr: 2, 
            verticalAlign: 'middle',
            color: '#00e676' // Green icon
          }} />
          Help & Support
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ color: '#e0e0e0' }} // Light gray text
        >
          Find answers to common questions or get help from our support team
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Card sx={{ 
        mb: 4,
        backgroundColor: '#1a1a1a', // Dark background
        color: '#ffffff', // White text
        border: '1px solid #ffd700', // Gold border
        boxShadow: '0 4px 20px rgba(255, 215, 0, 0.2)',
      }}>
        <CardContent>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              fontWeight: 600,
              color: '#00e676' // Green heading
            }}
          >
            Need Immediate Help?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              startIcon={<ContactSupport />}
              onClick={handleOpenSupportModal}
              sx={{ 
                textTransform: 'none',
                backgroundColor: '#00e676',
                color: '#000000',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#00c853',
                  boxShadow: '0 0 15px rgba(0, 230, 118, 0.5)'
                }
              }}
            >
              Submit Support Ticket
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<Help />}
              onClick={() => navigate('/dashboard')}
              sx={{ 
                textTransform: 'none',
                borderColor: '#ffd700',
                color: '#ffd700',
                '&:hover': {
                  borderColor: '#ffed4e',
                  backgroundColor: 'rgba(255, 215, 0, 0.1)',
                  color: '#ffed4e'
                }
              }}
            >
              Back to Dashboard
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Search and Filter Section */}
     {false && <Paper sx={{ 
        p: 3, 
        mb: 4,
        backgroundColor: '#1a1a1a', // Dark background
        color: '#ffffff', // White text
        border: '1px solid #ffd700', // Gold border
        boxShadow: '0 4px 20px rgba(255, 215, 0, 0.2)',
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 2, 
            fontWeight: 600,
            color: '#00e676' // Green heading
          }}
        >
          Search FAQs
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Search questions and answers"
            variant="outlined"
            value={faqSearch}
            onChange={(e) => setFaqSearch(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: '#ffd700' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiInputLabel-root': { color: '#ffd700' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#ffd700' },
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#2a2a2a',
                color: '#ffffff',
                '& fieldset': { borderColor: '#ffd700' },
                '&:hover fieldset': { borderColor: '#ffed4e' },
                '&.Mui-focused fieldset': { borderColor: '#ffd700' },
              }
            }}
          />
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{ 
              minWidth: 200,
              backgroundColor: '#2a2a2a',
              color: '#ffffff',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#ffd700',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#ffed4e',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#ffd700',
              },
              '& .MuiSvgIcon-root': {
                color: '#ffd700',
              }
            }}
          >
            {faqCategories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {React.cloneElement(category.icon, { sx: { color: '#00e676' } })}
                  {category.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Category Chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {faqCategories.map((category) => (
            <Chip
              key={category.id}
              label={category.label}
              icon={category.icon}
              onClick={() => setSelectedCategory(category.id)}
              color={selectedCategory === category.id ? 'primary' : 'default'}
              variant={selectedCategory === category.id ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Paper>
}
      {/* FAQ Results */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Frequently Asked Questions
          <Chip 
            label={`${filteredFaqs.length} results`} 
            size="small" 
            sx={{ ml: 2 }} 
          />
        </Typography>

        {filteredFaqs.length === 0 ? (
          <Alert severity="info">
            No FAQs found matching your search criteria. Try adjusting your search terms or category filter.
          </Alert>
        ) : (
          filteredFaqs.map((faq, index) => (
            <Accordion
              key={index}
              expanded={expandedAccordion === `panel${index}`}
              onChange={handleAccordionChange(`panel${index}`)}
              sx={{ mb: 1, backgroundColor: '#1a1a1a', color: '#ffffff', border: '1px solid #333' }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  {faqCategories.find(cat => cat.id === faq.category)?.icon}
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {faq.question}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {faq.answer}
                </Typography>
                {faq.details && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    {faq.details}
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {/* Support Ticket Modal */}
      <Modal
        open={openSupportModal}
        onClose={handleCloseSupportModal}
        aria-labelledby="support-modal-title"
        sx={{ zIndex: 1300,
          // p: { xs: 2, md: 4 }, 
      // maxWidth: '1200px', 
      mx: 'auto',
      minHeight: '100vh',
      // backgroundColor: '#0a0a0a', // Deep black background
      color: '#ffffff' // White text
         }} // Ensure it appears above other content
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: '#292929',
            boxShadow: 24,
            p: 4,
            width: { xs: '90%', sm: '500px' },
            borderRadius: 2,
            maxHeight: '90vh',
            overflow: 'auto'
          }}
        >
          <Typography id="support-modal-title" variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            <Support sx={{ mr: 1, verticalAlign: 'middle' }} />
            Submit Support Ticket
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1, color: '#b0b0b0' }}>
            Select Problem Type *
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 1.5,
            mb: 3
          }}>
            {[
              { value: 'account-issue', label: 'Account Issue', icon: <AccountCircle /> },
              { value: 'billing-issue', label: 'Billing/Payment Issue', icon: <Payment /> },
              { value: 'report-scammer', label: 'Report Scammer/Fraud', icon: <Warning /> },
              { value: 'technical-issue', label: 'Technical Issue', icon: <Help /> },
              { value: 'content-issue', label: 'Content Issue', icon: <InfoIcon /> },
              { value: 'other', label: 'Other', icon: <Support /> }
            ].map((option) => (
              <Button
                key={option.value}
                variant={supportProblemType === option.value ? 'contained' : 'outlined'}
                startIcon={option.icon}
                onClick={() => setSupportProblemType(option.value)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  py: 1.5,
                  px: 2,
                  backgroundColor: supportProblemType === option.value ? '#00e676' : 'transparent',
                  color: supportProblemType === option.value ? '#000000' : '#ffffff',
                  borderColor: supportProblemType === option.value ? '#00e676' : '#555555',
                  fontWeight: supportProblemType === option.value ? 'bold' : 'normal',
                  '&:hover': {
                    backgroundColor: supportProblemType === option.value ? '#00c853' : 'rgba(0, 230, 118, 0.1)',
                    borderColor: '#00e676',
                    color: supportProblemType === option.value ? '#000000' : '#00e676',
                  }
                }}
              >
                {option.label}
              </Button>
            ))}
          </Box>
          
          <TextField
            label="Ticket Title"
            fullWidth
            value={supportTitle}
            onChange={(e) => setSupportTitle(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Brief description of your issue"
          />
          
          <TextField
            label="Detailed Message"
            fullWidth
            multiline
            rows={4}
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Please provide as much detail as possible about your issue"
          />
          
          <TextField
            label="Contact Information"
            fullWidth
            value={supportContactInfo}
            onChange={(e) => setSupportContactInfo(e.target.value)}
            sx={{ mb: 3 }}
            placeholder="Email or phone number for follow-up"
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="text" onClick={handleCloseSupportModal}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSubmitSupportTicket}
              disabled={!supportProblemType || !supportTitle || !supportMessage}
            >
              Submit Ticket
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Snackbar */}
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default HelpPage;