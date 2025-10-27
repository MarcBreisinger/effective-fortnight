import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Grid,
  Card,
  CardContent,
  Slider,
  Alert,
  Chip,
  IconButton
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../contexts/AuthContext';
import { scheduleAPI } from '../services/api';

function MainSchedule() {
  const { user, logout, isStaff, isParent } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState(null);
  const [capacityLimit, setCapacityLimit] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSchedule();
  }, [selectedDate]);

  const fetchSchedule = async () => {
    setLoading(true);
    setError('');
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await scheduleAPI.getChildrenByDate(dateStr);
      setScheduleData(response.data);
      
      // Get capacity from schedule
      const scheduleResponse = await scheduleAPI.getByDate(dateStr);
      setCapacityLimit(scheduleResponse.data.capacity_limit);
    } catch (err) {
      setError('Failed to load schedule');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCapacityChange = async (event, newValue) => {
    setCapacityLimit(newValue);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await scheduleAPI.updateCapacity(dateStr, newValue);
      fetchSchedule(); // Reload to get updated attending status
    } catch (err) {
      setError('Failed to update capacity');
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getChildStatus = () => {
    if (!isParent || !user.children || !scheduleData) {
      return null;
    }

    // Check if any of the parent's children are in attending groups
    const attendingGroups = scheduleData.groups
      .filter(g => g.canAttend)
      .map(g => g.group);

    const childrenStatus = user.children.map(child => ({
      name: child.name,
      group: child.assigned_group,
      canAttend: attendingGroups.includes(child.assigned_group)
    }));

    return childrenStatus;
  };

  const childrenStatus = getChildStatus();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Day-Care Rotation Schedule
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user?.firstName} {user?.lastName} ({user?.role})
          </Typography>
          {isStaff && (
            <IconButton color="inherit" onClick={() => navigate('/staff')}>
              <SettingsIcon />
            </IconButton>
          )}
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Date Selector */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Paper>

        {/* Parent Status Indicator */}
        {isParent && childrenStatus && (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Your Children's Status for {format(selectedDate, 'MMMM d, yyyy')}
            </Typography>
            {childrenStatus.map((child, index) => (
              <Alert 
                key={index}
                severity={child.canAttend ? 'success' : 'warning'}
                sx={{ mb: 1 }}
              >
                <strong>{child.name}</strong> (Group {child.group}) - 
                {child.canAttend 
                  ? ' Can attend today' 
                  : ' Group is not attending today'}
              </Alert>
            ))}
          </Paper>
        )}

        {/* Staff Capacity Slider */}
        {isStaff && (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Capacity Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Adjust how many groups can attend
            </Typography>
            <Box sx={{ px: 2, mt: 2 }}>
              <Slider
                value={capacityLimit}
                onChange={handleCapacityChange}
                min={0}
                max={4}
                marks={[
                  { value: 0, label: '0' },
                  { value: 1, label: '1' },
                  { value: 2, label: '2' },
                  { value: 3, label: '3' },
                  { value: 4, label: '4' }
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
            <Typography variant="body2" align="center" sx={{ mt: 1 }}>
              Groups allowed: {capacityLimit} of 4
            </Typography>
          </Paper>
        )}

        {/* Group Lists */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Daily Group Order - {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </Typography>

        {loading ? (
          <Typography>Loading...</Typography>
        ) : scheduleData ? (
          <Grid container spacing={3}>
            {scheduleData.groups.map((groupData, index) => (
              <Grid item xs={12} sm={6} md={3} key={groupData.group}>
                <Card 
                  elevation={3}
                  sx={{ 
                    border: groupData.canAttend ? '2px solid #4caf50' : '2px solid #ff9800',
                    backgroundColor: groupData.canAttend ? '#f1f8f4' : '#fff3e0'
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h5" component="div">
                        Group {groupData.group}
                      </Typography>
                      <Chip 
                        label={groupData.canAttend ? 'Attending' : 'Stay Home'} 
                        color={groupData.canAttend ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Priority: #{index + 1}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                      Children ({groupData.children.length}):
                    </Typography>
                    {groupData.children.length > 0 ? (
                      <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                        {groupData.children.map(child => (
                          <li key={child.id}>
                            <Typography variant="body2">{child.name}</Typography>
                          </li>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        No children in this group
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography>No schedule data available</Typography>
        )}
      </Container>
    </Box>
  );
}

export default MainSchedule;
