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
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LanguageIcon from '@mui/icons-material/Language';
import LogoutIcon from '@mui/icons-material/Logout';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const StaffSettings = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm({
      ...profileForm,
      [name]: value
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await authAPI.updateProfile(profileForm);
      // Update global user state with new profile info
      setUser(prevUser => ({
        ...prevUser,
        ...response.data.user
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

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {message.text && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
            {message.text}
          </Alert>
        )}

        {/* Profile Settings */}
        <Paper elevation={3} sx={{ p: 3 }}>
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
            
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t('language')}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<LanguageIcon />}
                onClick={toggleLanguage}
                fullWidth
              >
                {language === 'en' ? t('switchToGerman') : t('switchToEnglish')}
              </Button>
            </Box>
            
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

        {/* Logout */}
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            fullWidth
          >
            {t('logout')}
          </Button>
        </Paper>
      </Container>
    </>
  );
};

export default StaffSettings;
