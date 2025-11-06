import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  CircularProgress
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { authAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, language, toggleLanguage } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError(t('invalidResetLink'));
        setVerifying(false);
        return;
      }

      try {
        const response = await authAPI.verifyResetToken(token);
        if (response.data.valid) {
          setValidToken(true);
        } else {
          setError(t('expiredResetLink'));
        }
      } catch (err) {
        setError(err.response?.data?.error || t('invalidResetLink'));
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.resetPassword(token, password);
      setSuccess(response.data.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('resetPasswordError'));
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, mb: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            {t('verifyingResetLink')}
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!validToken) {
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
              {t('invalidResetLink')}
            </Typography>
            
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                <Link to="/forgot-password" style={{ textDecoration: 'none', color: '#1976d2' }}>
                  {t('requestNewResetLink')}
                </Link>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
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
            {t('resetPassword')}
          </Typography>
          <Typography variant="body2" gutterBottom align="center" color="text.secondary" sx={{ mb: 3 }}>
            {t('resetPasswordInstructions')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
              <Typography variant="body2" sx={{ mt: 1 }}>
                {t('redirectingToLogin')}
              </Typography>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label={t('newPassword')}
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading || !!success}
            />
            <TextField
              label={t('confirmPassword')}
              type="password"
              fullWidth
              margin="normal"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
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
              {loading ? t('loading') : t('resetPasswordButton')}
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

export default ResetPassword;
