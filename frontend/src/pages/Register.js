import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [formData, setFormData] = useState({
    registrationCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register({
        registrationCode: formData.registrationCode,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <IconButton onClick={toggleLanguage} color="primary">
              <LanguageIcon />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {language === 'en' ? 'DE' : 'EN'}
              </Typography>
            </IconButton>
          </Box>
          
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('dayCareRotationSchedule')}
          </Typography>
          <Typography variant="h6" gutterBottom align="center" color="text.secondary">
            {t('register')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label={t('registrationCode')}
              name="registrationCode"
              fullWidth
              margin="normal"
              value={formData.registrationCode}
              onChange={handleChange}
              required
              helperText={t('enterRegistrationCode')}
            />
            <TextField
              label={t('firstName')}
              name="firstName"
              fullWidth
              margin="normal"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <TextField
              label={t('lastName')}
              name="lastName"
              fullWidth
              margin="normal"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
            <TextField
              label={t('email')}
              name="email"
              type="email"
              fullWidth
              margin="normal"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
            <TextField
              label={t('phoneOptional')}
              name="phone"
              type="tel"
              fullWidth
              margin="normal"
              value={formData.phone}
              onChange={handleChange}
            />
            <TextField
              label={t('password')}
              name="password"
              type="password"
              fullWidth
              margin="normal"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <TextField
              label={t('password')}
              name="confirmPassword"
              type="password"
              fullWidth
              margin="normal"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? t('saving') : t('registerButton')}
            </Button>
          </form>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              {t('login')}{' '}
              <Link to="/login" style={{ textDecoration: 'none', color: '#1976d2' }}>
                {t('loginButton')}
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Register;
