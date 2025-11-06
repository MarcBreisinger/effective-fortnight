import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveIcon from '@mui/icons-material/Save';
import LanguageIcon from '@mui/icons-material/Language';
import { scheduleAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const GROUPS = ['A', 'B', 'C', 'D'];

// Only allow 4 cyclic rotations: ABCD, BCDA, CDAB, DABC
const ALL_ROTATIONS = [
  ['A', 'B', 'C', 'D'],
  ['B', 'C', 'D', 'A'],
  ['C', 'D', 'A', 'B'],
  ['D', 'A', 'B', 'C']
];

function RotationEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [rotations, setRotations] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMonthRotations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
      const allDays = eachDayOfInterval({ start, end });
      // Filter out weekends
      const days = allDays.filter(day => {
        const dayOfWeek = day.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6;
      });

      const rotationData = {};
      
      // Load existing rotations for each day
      for (const day of days) {
        const dateStr = format(day, 'yyyy-MM-dd');
        try {
          const response = await scheduleAPI.getByDate(dateStr);
          rotationData[dateStr] = response.data.group_order || ['A', 'B', 'C', 'D'];
        } catch (err) {
          // If no schedule exists, use default order
          rotationData[dateStr] = ['A', 'B', 'C', 'D'];
        }
      }

      setRotations(rotationData);
    } catch (err) {
      setError(t('failedToLoadRotations'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, t]);

  useEffect(() => {
    loadMonthRotations();
  }, [selectedMonth, loadMonthRotations]);

  const handleRotationChange = (dateStr, newRotation) => {
    setRotations(prev => ({
      ...prev,
      [dateStr]: newRotation
    }));
  };

  const handleSaveAll = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Save each day's rotation
      const promises = Object.entries(rotations).map(([dateStr, groupOrder]) => {
        return scheduleAPI.updateRotation(dateStr, groupOrder);
      });

      await Promise.all(promises);
      setSuccess(t('allRotationsSaved'));
    } catch (err) {
      setError(t('failedToSaveRotations'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const allDays = eachDayOfInterval({ start, end });
    // Filter out weekends (Saturday = 6, Sunday = 0)
    return allDays.filter(day => {
      const dayOfWeek = day.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });
  };

  const days = getDaysInMonth();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/')} title={t('back')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            {t('editGroupRotations')}
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

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Month Selector */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={handlePreviousMonth}
              color="primary"
              aria-label={t('previousMonth')}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Box sx={{ flexGrow: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label={t('selectMonth')}
                  value={selectedMonth}
                  onChange={(newDate) => setSelectedMonth(newDate)}
                  format="MM.yyyy"
                  views={['year', 'month']}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Box>
            
            <IconButton 
              onClick={handleNextMonth}
              color="primary"
              aria-label={t('nextMonth')}
            >
              <ArrowForwardIcon />
            </IconButton>
          </Box>
        </Paper>

        {/* Rotation Table */}
        <Paper elevation={3}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: 150 }}>{t('date')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: 120 }}>{t('day')}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{t('groupRotation')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {t('loading')}
                    </TableCell>
                  </TableRow>
                ) : (
                  days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const rotation = rotations[dateStr] || ['A', 'B', 'C', 'D'];
                    const rotationKey = rotation.join('');

                    return (
                      <TableRow 
                        key={dateStr}
                        sx={{ 
                          '&:hover': { backgroundColor: '#e3f2fd' }
                        }}
                      >
                        <TableCell>{format(day, 'dd.MM.yyyy')}</TableCell>
                        <TableCell>
                          {format(day, 'EEEE', { locale: language === 'de' ? de : undefined })}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {ALL_ROTATIONS.map((perm) => {
                              const permKey = perm.join('');
                              const isSelected = permKey === rotationKey;
                              return (
                                <Button
                                  key={permKey}
                                  variant={isSelected ? 'contained' : 'outlined'}
                                  size="small"
                                  onClick={() => handleRotationChange(dateStr, perm)}
                                  sx={{ 
                                    minWidth: 80,
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  {perm.join(' → ')}
                                </Button>
                              );
                            })}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveAll}
            disabled={loading}
          >
            {t('saveAllChanges')}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default RotationEditor;
