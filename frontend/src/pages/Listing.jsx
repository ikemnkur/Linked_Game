import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Stack,
  Skeleton,
  Grid2 as Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Chip,
  Paper,
  Card,
  CardContent
} from '@mui/material';
import { Edit, Delete, Add, Storefront, ShoppingBag, Share } from '@mui/icons-material';
import api from '../api/client';
import KeyCard from '../components/KeyCardListing';
import KeyRevealDialog from '../components/KeyRevealDialog';
import { useToast } from '../contexts/ToastContext';

export default function Listing() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyValue, setKeyValue] = useState('');
  const [open, setOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    keyTitle: '',
    description: '',
    price: '',
    // tags: '',
    isActive: true
  });
  const { error, info, success } = useToast();
  const userData = JSON.parse(localStorage.getItem("userdata") || '{"username":"user_123"}');
  const navigate = useNavigate();

  const loadListings = async () => {
    try {
      const username = userData.username;
      const { data } = await api.get(`/api/listings/${username}`);
      setItems(data || []);
    } catch (e) {
      console.error('Failed to load listings:', e);
      // Only show error message, don't set demo items
      error('Failed to load your listings');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleUnlock = async (item) => {
    try {
      info('Unlocking…');
      const { data } = await api.post(`/unlock/${item.id}`);
      if (data?.key) {
        setKeyValue(data.key);
        setOpen(true);
      } else {
        error('Unlock failed');
      }
    } catch (e) {
      if (e?.response?.status === 402) return error('Insufficient credits');
      error('Server error');
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditFormData({
      keyTitle: item.keyTitle || item.title || '',
      description: item.description || '',
      price: item.price || item.price_credits || '',
      // tags: Array.isArray(item.tags) ? item.tags.join(', ') :
      //   (typeof item.tags === 'string' ? item.tags : ''),
      isActive: item.isActive !== undefined ? item.isActive : true
    });
    setEditDialogOpen(true);
  };

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleShare = (item) => {
    let currentUrl = window.location.origin;
    if (currentUrl.endsWith('/')) currentUrl = currentUrl.slice(0, -1);
    const url = `${currentUrl}/unlock/${item.id}`;
    setShareUrl(url);
    setShareDialogOpen(true);
    setCopied(false);
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      error('Failed to copy link');
    }
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const submitEdit = async () => {
    if (!selectedItem) return;

    try {
      const updateData = {
        keyTitle: editFormData.keyTitle,
        description: editFormData.description,
        price: parseInt(editFormData.price),
        // tags: editFormData.tags,
        isActive: editFormData.isActive
      };

      const { data } = await api.put(`/api/listings/${selectedItem.id}`, updateData);

      if (data.success) {
        success('Listing updated successfully');
        setEditDialogOpen(false);
        setSelectedItem(null);
        // Refresh listings
        await loadListings();
      } else {
        error(data.message || 'Failed to update listing');
      }
    } catch (e) {
      console.error('Edit error:', e);
      error(e.response?.data?.message || 'Failed to update listing');
    }
  };

  const submitDelete = async () => {
    if (!selectedItem) return;

    try {
      const { data } = await api.delete(`/api/listings/${selectedItem.id}`, {
        data: { username: userData.username }
      });

      if (data.success) {
        success(data.message || 'Listing deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedItem(null);
        // Refresh listings
        await loadListings();
      } else {
        error(data.message || 'Failed to delete listing');
      }
    } catch (e) {
      console.error('Delete error:', e);
      error(e.response?.data?.message || 'Failed to delete listing');
    }
  };

  return (
    <Container sx={{ py: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Stack spacing={1} mb={3}>
        <Typography variant="h4" color="primary.main">Your Key Listings For Sale</Typography>
        <Typography variant="body1" sx={{ opacity: 0.8, color: 'text.secondary' }}>View and manage the keys that you have on sale.</Typography>
      </Stack>

      {loading ? (
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={180} animation="wave" sx={{ bgcolor: 'grey.800' }} />
            </Grid>
          ))}
        </Grid>
      ) : items.length === 0 ? (
        // Empty State UI
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <Card sx={{ maxWidth: 500, textAlign: 'center', bgcolor: '#000000', boxShadow: 3, borderRadius: 3, border: '2px solid #884' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ mb: 3 }}>
                <Storefront
                  sx={{
                    fontSize: 80,
                    color: 'primary.main',
                    opacity: 0.6,
                    mb: 2
                  }}
                />
              </Box>
              <Typography variant="h5" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
                No Listings Yet
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3, lineHeight: 1.6 }}>
                You haven't created any key listings for sale yet. Start by uploading your first batch of keys to begin earning credits!
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<Add />}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2
                }}
                onClick={() => navigate('/create-key')}
              >
                Create Your First Listing
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary', opacity: 0.8 }}>
                Upload keys in .txt or .csv format, or paste them directly
              </Typography>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {items.map(item => (
            <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <KeyCard item={item} onUnlock={() => handleUnlock(item)} />
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => handleEdit(item)}
                  sx={{ flex: 1, color: 'primary.light', borderColor: 'primary.dark' }}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Share />}
                  onClick={() => handleShare(item)}
                  sx={{
                    flex: 1,
                    color: '#08FF00',
                    borderColor: '#08FF00', // Green outline
                    '&:hover': {
                      borderColor: '#00c853', // Darker green on hover
                      backgroundColor: 'rgba(8,255,0,0.08)'
                    }
                  }}
                >
                  Share
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => handleDelete(item)}
                  sx={{ flex: 1, color: 'error.light', borderColor: 'error.dark' }}
                >
                  Delete
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'background.default', border: '1px solid #884', color: 'rgba(186, 186, 39, 1)' }
        }}
      >
        <DialogTitle>Edit Listing</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, backgroundColor: 'grey.900', p: 2, borderRadius: 1 }} >
            <TextField
              label="Title"
              fullWidth
              value={editFormData.keyTitle}
              onChange={(e) => setEditFormData({ ...editFormData, keyTitle: e.target.value })}
              InputProps={{ sx: { color: 'text.primary' } }}
              InputLabelProps={{ sx: { color: 'text.secondary' } }}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              InputProps={{ sx: { color: 'text.primary' } }}
              InputLabelProps={{ sx: { color: 'text.secondary' } }}
            />
            <TextField
              label="Price (credits)"
              fullWidth
              type="number"
              value={editFormData.price}
              onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
              InputProps={{ sx: { color: 'text.primary' } }}
              InputLabelProps={{ sx: { color: 'text.secondary' } }}
            />
            {/* <TextField
              label="Tags (comma separated)"
              fullWidth
              value={editFormData.tags}
              onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
              helperText="e.g., gaming, software, premium"
              InputProps={{ sx: { color: 'text.primary' } }}
              InputLabelProps={{ sx: { color: 'text.secondary' } }}
            /> */}
            <FormControlLabel
              control={
                <Switch
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  color="primary"
                />
              }
              label="Active (visible to buyers)"
              sx={{ color: 'text.secondary' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={submitEdit} variant="contained" color="primary">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        PaperProps={{
          sx: { bgcolor: 'background.default', border: '1px solid #884', color: 'rgba(186, 186, 39, 1)' }
        }}
      >
        <DialogTitle>Delete Listing</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedItem?.keyTitle || selectedItem?.title}"?
          </Typography>
          {selectedItem?.sold > 0 && (
            <Typography color="warning.main" sx={{ mt: 1 }}>
              Note: This listing has sold {selectedItem.sold} keys. It will be deactivated instead of deleted.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button onClick={submitDelete} variant="contained" color="error">
            {selectedItem?.sold > 0 ? 'Deactivate' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: 'background.default', border: '1px solid #884', color: 'rgba(186, 186, 39, 1)' }
        }}
      >
        <DialogTitle>Share Listing</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Share this link to let others unlock keys from this listing:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              value={shareUrl}
              InputProps={{
                readOnly: true,
                sx: { color: 'text.primary' }
              }}
              InputLabelProps={{ sx: { color: 'text.secondary' } }}
            />
            <Button
              variant="contained"
              onClick={handleCopyShareUrl}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)} sx={{ color: 'text.secondary' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Key Reveal Dialog */}

      <KeyRevealDialog open={open} onClose={() => setOpen(false)} value={keyValue} />
    </Container>
  );
}