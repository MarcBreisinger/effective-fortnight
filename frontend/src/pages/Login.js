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

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
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
            {t('login')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
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
            />
            <TextField
              label={t('password')}
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? t('loading') : t('loginButton')}
            </Button>
          </form>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              <Link to="/forgot-password" style={{ textDecoration: 'none', color: '#1976d2' }}>
                {t('forgotPassword')}
              </Link>
            </Typography>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              {t('register')}{' '}
              <Link to="/register" style={{ textDecoration: 'none', color: '#1976d2' }}>
                {t('registrationCode')}
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
