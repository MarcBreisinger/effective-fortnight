import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  ListItemAvatar,
  AppBar,
  Toolbar,
  FormControlLabel,
  Switch
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import LanguageIcon from '@mui/icons-material/Language';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getChildAvatarPath } from '../utils/animalAvatars';

const ParentSettings = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    showSlotOccupancy: false
  });

  // Children state
  const [children, setChildren] = useState([]);
  const [editChildDialog, setEditChildDialog] = useState({
    open: false,
    childId: null,
    childName: ''
  });

  // Add child dialog state
  const [addChildDialog, setAddChildDialog] = useState({
    open: false,
    registrationCode: ''
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        showSlotOccupancy: user.showSlotOccupancy || false
      });
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setChildren(response.data.children || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setMessage({ type: 'error', text: 'Failed to load user data' });
    }
  };

  const handleProfileChange = (e) => {
    const { name, value, checked, type } = e.target;
    setProfileForm({
      ...profileForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await authAPI.updateProfile(profileForm);
      // Update global user state with new profile info, preserving children
      setUser(prevUser => ({
        ...prevUser,
        ...response.data.user,
        children: prevUser.children // Preserve children array
      }));
      setMessage({ type: 'success', text: t('profileUpdatedSuccess') });
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMsg = error.response?.data?.error || t('failedToUpdateProfile');
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleEditChild = (child) => {
    setEditChildDialog({
      open: true,
      childId: child.id,
      childName: child.name
    });
  };

  const handleCloseEditChild = () => {
    setEditChildDialog({
      open: false,
      childId: null,
      childName: ''
    });
  };

  const handleChildNameChange = (e) => {
    setEditChildDialog({
      ...editChildDialog,
      childName: e.target.value
    });
  };

    const handleChildNameSubmit = async () => {
    if (!editChildDialog.childName.trim()) {
      setMessage({ type: 'error', text: t('childNameCannotBeEmpty') });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await authAPI.updateChildName(editChildDialog.childId, editChildDialog.childName);
      
      // Update local children state
      const updatedChildren = children.map(child =>
        child.id === editChildDialog.childId
          ? { ...child, name: editChildDialog.childName }
          : child
      );
      setChildren(updatedChildren);
      
      // Update global user state with updated children
      setUser(prevUser => ({
        ...prevUser,
        children: updatedChildren
      }));
      
      setMessage({ type: 'success', text: t('childNameUpdatedSuccess') });
      handleCloseEditChild();
    } catch (error) {
      console.error('Error updating child name:', error);
      const errorMsg = error.response?.data?.error || t('failedToUpdateChildName');
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleChildNameSubmit();
    }
  };

  const handleOpenAddChild = () => {
    setAddChildDialog({
      open: true,
      registrationCode: ''
    });
  };

  const handleCloseAddChild = () => {
    setAddChildDialog({
      open: false,
      registrationCode: ''
    });
    setMessage({ type: '', text: '' });
  };

  const handleAddChildCodeChange = (e) => {
    setAddChildDialog({
      ...addChildDialog,
      registrationCode: e.target.value
    });
  };

  const handleAddChildSubmit = async () => {
    if (!addChildDialog.registrationCode.trim()) {
      setMessage({ type: 'error', text: t('invalidRegistrationCode') });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await authAPI.linkChild(addChildDialog.registrationCode);
      
      // Add new child to local state
      const newChild = response.data.child;
      const updatedChildren = [...children, newChild];
      setChildren(updatedChildren);
      
      // Update global user state with updated children
      setUser(prevUser => ({
        ...prevUser,
        children: updatedChildren
      }));
      
      setMessage({ type: 'success', text: t('childLinkedSuccess').replace('#', newChild.name) });
      handleCloseAddChild();
    } catch (error) {
      console.error('Error linking child:', error);
      const errorMsg = error.response?.data?.error || t('invalidRegistrationCode');
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleAddChildKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddChildSubmit();
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
            title={t('back')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('settings')}
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Button
            color="inherit"
            startIcon={<LanguageIcon />}
            onClick={toggleLanguage}
          >
            {language === 'en' ? 'DE' : 'EN'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {message.text && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        {/* Profile Settings */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('profileInformation')}
          </Typography>
          <Box component="form" onSubmit={handleProfileSubmit}>
            <TextField
              label={t('firstName')}
              name="firstName"
              value={profileForm.firstName}
              onChange={handleProfileChange}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label={t('lastName')}
              name="lastName"
              value={profileForm.lastName}
              onChange={handleProfileChange}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label={t('email')}
              name="email"
              type="email"
              value={profileForm.email}
              onChange={handleProfileChange}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label={t('phoneOptional')}
              name="phone"
              value={profileForm.phone}
              onChange={handleProfileChange}
              fullWidth
              margin="normal"
            />
            
            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, mb: 1 }}>
              {t('displayPreferences')}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={profileForm.showSlotOccupancy}
                  onChange={handleProfileChange}
                  name="showSlotOccupancy"
                  color="primary"
                />
              }
              label={t('showSlotOccupancyLabel')}
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
              {t('showSlotOccupancyHelp')}
            </Typography>
            
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? t('saving') : t('saveProfile')}
          </Button>
        </Box>
      </Paper>

      {/* Children Settings */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6">
              {t('myChildren')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('editChildrenNames')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddChild}
          >
            {t('addChild')}
          </Button>
        </Box>
        
        {children.length > 0 ? (
          <List>
            {children.map((child, index) => (
              <React.Fragment key={child.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleEditChild(child)}>
                      <EditIcon />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar 
                      variant="square" 
                      sx={{ bgcolor: 'transparent' }}
                      src={getChildAvatarPath(child.id)}
                      alt={child.name}
                    >
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={child.name}
                    secondary={`${t('group')} ${child.assigned_group}`}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            {t('noChildrenLinked')}
          </Typography>
        )}
      </Paper>

      {/* Edit Child Name Dialog */}
      <Dialog open={editChildDialog.open} onClose={handleCloseEditChild}>
        <DialogTitle>{t('editChildName')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('childName')}
            type="text"
            fullWidth
            value={editChildDialog.childName}
            onChange={handleChildNameChange}
            onKeyPress={handleKeyPress}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditChild} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleChildNameSubmit} variant="contained" disabled={loading}>
            {loading ? t('saving') : t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Child Dialog */}
      <Dialog 
        open={addChildDialog.open} 
        onClose={handleCloseAddChild}
        TransitionProps={{
          onEntered: () => {
            const input = document.querySelector('#add-child-registration-code');
            if (input) input.focus();
          }
        }}
      >
        <DialogTitle>{t('addChildToAccount')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('enterRegistrationCode')}
          </Typography>
          <TextField
            id="add-child-registration-code"
            margin="dense"
            label={t('registrationCode')}
            type="text"
            fullWidth
            value={addChildDialog.registrationCode}
            onChange={handleAddChildCodeChange}
            onKeyPress={handleAddChildKeyPress}
            placeholder={t('registrationCodePlaceholder')}
            helperText={t('registrationCodeHelper')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddChild} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleAddChildSubmit} variant="contained" disabled={loading}>
            {loading ? t('linking') : t('linkChild')}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </>
  );
};

export default ParentSettings;
