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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LanguageIcon from '@mui/icons-material/Language';
import { authAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

function ForgotPassword() {
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(email);
      setSuccess(response.data.message);
      setEmail(''); // Clear the form
    } catch (err) {
      setError(err.response?.data?.error || t('forgotPasswordError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate('/login')} title={t('back')}>
              <ArrowBackIcon />
            </IconButton>
            <IconButton onClick={toggleLanguage} color="primary">
              <LanguageIcon />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {language === 'en' ? 'DE' : 'EN'}
              </Typography>
            </IconButton>
          </Box>
          
          <Typography variant="h4" component="h1" gutterBottom align="center">
            {t('forgotPassword')}
          </Typography>
          <Typography variant="body2" gutterBottom align="center" color="text.secondary" sx={{ mb: 3 }}>
            {t('forgotPasswordInstructions')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label={t('email')}
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading || !!success}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || !!success}
            >
              {loading ? t('loading') : t('sendResetLink')}
            </Button>
          </form>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              <Link to="/login" style={{ textDecoration: 'none', color: '#1976d2' }}>
                {t('backToLogin')}
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default ForgotPassword;
