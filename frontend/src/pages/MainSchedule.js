import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  Grid,
  Card,
  CardContent,
  Slider,
  Alert,
  Chip,
  IconButton,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Tooltip
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ListIcon from '@mui/icons-material/List';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import CancelIcon from '@mui/icons-material/Cancel';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { scheduleAPI, activityAPI, attendanceAPI } from '../services/api';
import AttendanceStatusCard from '../components/AttendanceStatusCard';
import ActivityLog from '../components/ActivityLog';
import { getChildAvatarPath } from '../utils/animalAvatars';
import { isPastDate } from '../utils/dateValidation';

// Helper function to get nearest weekday
const getNearestWeekday = (date) => {
  const day = date.getDay();
  if (day === 0) { // Sunday -> next Monday
    return addDays(date, 1);
  }
  if (day === 6) { // Saturday -> next Monday
    return addDays(date, 2);
  }
  return date;
};

function MainSchedule() {
  const { user, isStaff, isParent } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(getNearestWeekday(new Date()));
  const [scheduleData, setScheduleData] = useState(null);
  const [capacityLimit, setCapacityLimit] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slotLostAlert, setSlotLostAlert] = useState(null); // Track when children lose slots with date
  const [lastUpdate, setLastUpdate] = useState(Date.now()); // Track when schedule was last updated
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const previousDataRef = useRef(null); // Use ref to avoid triggering re-renders
  const previousAttendingGroupsRef = useRef(null); // Use ref instead of state to avoid re-renders
  const abortControllerRef = useRef(null); // Track abort controller for cancelling requests
  const isFetchingRef = useRef(false); // Prevent overlapping requests

  // Check if selected date is in the past
  const isSelectedDatePast = isPastDate(selectedDate);

  // Memoize schedule data to prevent unnecessary recalculations
  const memoizedScheduleData = useMemo(() => scheduleData, [scheduleData]);

  const fetchSchedule = useCallback(async (isInitialLoad = false) => {
    // Prevent overlapping requests
    if (isFetchingRef.current) {
      console.log('Skipping fetch - request already in progress');
      return;
    }
    
    isFetchingRef.current = true;
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Only show loading state on initial load, not on polling updates
    if (isInitialLoad) {
      setLoading(true);
    }
    setError('');
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await scheduleAPI.getChildrenByDate(dateStr);
      const newScheduleData = response.data;
      
      // Get capacity from schedule
      const scheduleResponse = await scheduleAPI.getByDate(dateStr);
      const newCapacity = scheduleResponse.data.capacity_limit;
      
      // Create a stable string representation for comparison
      const newDataString = JSON.stringify(newScheduleData);
      const hasDataChanged = previousDataRef.current !== newDataString;
      
      // Only process changes if data actually changed
      if (hasDataChanged || isInitialLoad) {
        // Check if any parent's child lost their slot (for parents only)
        if (isParent && user?.children && previousAttendingGroupsRef.current !== null && !isInitialLoad) {
          const newAttendingGroups = newScheduleData.groups
            .filter(g => g.canAttend)
            .map(g => g.group);
          
          // Check if any of the parent's children lost their slot
          const childrenWhoLostSlots = [];
          user.children.forEach(child => {
            const wasAttending = previousAttendingGroupsRef.current.includes(child.assigned_group);
            const isAttending = newAttendingGroups.includes(child.assigned_group);
            
            if (wasAttending && !isAttending) {
              // Child lost their slot!
              childrenWhoLostSlots.push({
                childName: child.name,
                group: child.assigned_group
              });
            }
          });
          
          // If any children lost slots, show the alert with date information
          if (childrenWhoLostSlots.length > 0) {
            setSlotLostAlert({
              children: childrenWhoLostSlots,
              date: selectedDate
            });
          }
          
          previousAttendingGroupsRef.current = newAttendingGroups;
        } else if (isParent && user?.children && (isInitialLoad || previousAttendingGroupsRef.current === null)) {
          // Initialize previous state on first load for parents
          const initialAttendingGroups = newScheduleData.groups
            .filter(g => g.canAttend)
            .map(g => g.group);
          previousAttendingGroupsRef.current = initialAttendingGroups;
        }
        
        // Update ref for next comparison
        previousDataRef.current = newDataString;
        
        // Update state only if changed
        setScheduleData(newScheduleData);
        setCapacityLimit(newCapacity);
        setLastUpdate(Date.now()); // Update timestamp to trigger child component reloads
      }
    } catch (err) {
      // Ignore abort errors (they're expected when component unmounts or date changes)
      if (err.name === 'AbortError') {
        isFetchingRef.current = false;
        return;
      }
      setError('Failed to load schedule');
      console.error(err);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
      isFetchingRef.current = false; // Release the lock
    }
  }, [selectedDate, isParent, user]);

  const fetchActivities = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setActivitiesLoading(true);
    }
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await activityAPI.getByDate(dateStr);
      setActivities(response.data.events || []);
    } catch (err) {
      console.error('Failed to load activity log:', err);
      // Don't clear activities on error during background refresh
      if (showLoading) {
        setActivities([]);
      }
    } finally {
      if (showLoading) {
        setActivitiesLoading(false);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    // Reset alert and tracking refs when date changes
    setSlotLostAlert(null);
    previousAttendingGroupsRef.current = null;
    previousDataRef.current = null;
    
    fetchSchedule(true); // Initial load with loading spinner
    fetchActivities(true); // Load activities for the date with loading spinner
    
    // Set up polling for automatic updates (every 10 seconds)
    const pollInterval = setInterval(() => {
      fetchSchedule(false); // Background updates without loading spinner
      fetchActivities(false); // Update activity log without loading spinner
    }, 10000); // Increased from 5000 to 10000 to reduce request frequency

    // Cleanup interval and abort pending requests on unmount or when date changes
    return () => {
      clearInterval(pollInterval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedDate, fetchSchedule, fetchActivities]);

  const handleCapacityChange = async (event, newValue) => {
    setCapacityLimit(newValue);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await scheduleAPI.updateCapacity(dateStr, newValue);
      fetchSchedule(); // Reload to get updated attending status
      fetchActivities(false); // Refresh activity log without loading spinner
    } catch (err) {
      setError('Failed to update capacity');
      console.error(err);
    }
  };

  const handlePreviousDay = () => {
    let newDate = subDays(selectedDate, 1);
    // Skip weekends - if Saturday, go to Friday
    if (newDate.getDay() === 6) {
      newDate = subDays(newDate, 1);
    }
    // If Sunday, go to Friday
    if (newDate.getDay() === 0) {
      newDate = subDays(newDate, 2);
    }
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    let newDate = addDays(selectedDate, 1);
    // Skip weekends - if Saturday, go to Monday
    if (newDate.getDay() === 6) {
      newDate = addDays(newDate, 2);
    }
    // If Sunday, go to Monday
    if (newDate.getDay() === 0) {
      newDate = addDays(newDate, 1);
    }
    setSelectedDate(newDate);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('dayCareRotationSchedule')}
          </Typography>
          <Tooltip title={t('activityLog.title')}>
            <IconButton 
              color="inherit" 
              onClick={() => setActivityDrawerOpen(true)}
              sx={{ mr: 1 }}
            >
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          {isStaff && (
            <>
              <IconButton color="inherit" onClick={() => navigate('/staff/rotations')} title={t('editGroupRotations')}>
                <CalendarMonthIcon />
              </IconButton>
              <IconButton color="inherit" onClick={() => navigate('/staff')} title={t('staffDashboard')}>
                <ListIcon />
              </IconButton>
            </>
          )}
          <IconButton 
            color="inherit" 
            onClick={() => navigate(isStaff ? '/staff/settings' : '/settings')} 
            title={t('settings')}
          >
            <AccountCircleIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Main Content Area */}
          <Grid item xs={12} lg={9}>
            <Box>

        {/* Date Selector */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={handlePreviousDay}
              color="primary"
              aria-label={t('previousDay')}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Box sx={{ flexGrow: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label={t('selectDate')}
                  value={selectedDate}
                  onChange={(newDate) => setSelectedDate(newDate)}
                  format="dd.MM.yyyy"
                  shouldDisableDate={(date) => {
                    const day = date.getDay();
                    return day === 0 || day === 6; // Disable Sunday (0) and Saturday (6)
                  }}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Box>
            
            <IconButton 
              onClick={handleNextDay}
              color="primary"
              aria-label={t('nextDay')}
            >
              <ArrowForwardIcon />
            </IconButton>
          </Box>
        </Paper>

        {/* Parent Status Indicator */}
        {isParent && memoizedScheduleData && (
          <Box sx={{ mb: 3 }}>
            {user?.children && user.children.length > 0 ? (
              <>
                <Typography variant="h6" gutterBottom>
                  {t('yourChildrenStatus')} {format(selectedDate, 'EEEE', { locale: language === 'de' ? de : undefined })}, {format(selectedDate, 'dd.MM.yyyy')}
                </Typography>

                {user.children.map((child) => {
                  const attendingGroups = memoizedScheduleData.groups
                    .filter(g => g.canAttend)
                    .map(g => g.group);
                  
                  // Check if child's group is attending OR if child is additionally attending
                  const isInAttendingGroup = attendingGroups.includes(child.assigned_group);
                  const isAdditionallyAttending = memoizedScheduleData.additionally_attending?.some(ac => ac.id === child.id);
                  const canAttend = isInAttendingGroup || isAdditionallyAttending;
                  
                  return (
                    <AttendanceStatusCard
                      key={child.id}
                      child={child}
                      selectedDate={selectedDate}
                      canAttend={canAttend}
                      isAdditionallyAttending={isAdditionallyAttending}
                      lastUpdate={lastUpdate}
                      onStatusChange={() => fetchSchedule(false)}
                    />
                  );
                })}

                {/* Overall Capacity Summary */}
                <Paper elevation={2} sx={{ p: 2, mt: 3, backgroundColor: '#f9f9f9' }}>
                  {(() => {
                    const attendingGroups = memoizedScheduleData.groups.filter(g => g.canAttend);
                    const totalAttending = attendingGroups.reduce((sum, g) => sum + g.attending, 0);
                    const totalCapacity = attendingGroups.reduce((sum, g) => sum + g.capacity, 0);
                    const totalAvailable = totalCapacity - totalAttending;

                    return (
                      <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                        <strong>{t('dayCareCapacity')}</strong>
                        <span>{t('totalCapacity')} {totalCapacity}</span>
                        <span>•</span>
                        <span style={{ color: totalAvailable > 0 ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>
                          {t('slotsAvailable')} {totalAvailable}
                        </span>
                      </Typography>
                    );
                  })()}
                </Paper>
              </>
            ) : (
              <Alert severity="info" sx={{ mb: 3 }}>
                {t('noChildrenLinked')}
              </Alert>
            )}
          </Box>
        )}

        {/* Staff Capacity Slider */}
        {isStaff && (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('capacitySettings')}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('adjustGroupsAttend')}
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
                disabled={isSelectedDatePast}
              />
            </Box>
            <Typography variant="body2" align="center" sx={{ mt: 1 }}>
              {t('groupsAllowed')}: {capacityLimit} {t('of')} 4
            </Typography>
            {isSelectedDatePast && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {t('cannotModifyPastDates')}
              </Alert>
            )}
          </Paper>
        )}

        {loading ? (
          <Typography>{t('loading')}</Typography>
        ) : memoizedScheduleData ? (
          <>
            {/* Additionally Attending (from waiting list) */}
            {/* Additionally Attending (from waiting list) */}
            {memoizedScheduleData.additionally_attending && memoizedScheduleData.additionally_attending.length > 0 && (
              <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: '#e8f5e9', border: '2px solid #4caf50' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={t('additionallyAttending')} color="success" />
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 2 }}>
                  {memoizedScheduleData.additionally_attending.map(child => (
                    <li key={child.id} style={{ marginBottom: '8px' }}>
                      <Box>
                        <Typography variant="body1">
                          <strong>{child.name}</strong> (Group {child.assigned_group})
                          {child.parent_message && (
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                              - {child.parent_message}
                            </Typography>
                          )}
                        </Typography>
                        {(isStaff || user?.showSlotOccupancy) && (child.occupied_slot_from_child_name || child.occupied_slot_from_group) && (
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '0.75rem', fontStyle: 'italic', display: 'block', mt: 0.5 }}
                          >
                            {child.occupied_slot_from_child_name 
                              ? t('usingSlotOf').replace('#', child.occupied_slot_from_child_name)
                              : t('usingFreeSlotFromGroup').replace('#', child.occupied_slot_from_group)
                            }
                          </Typography>
                        )}
                        {child.updated_at && child.updated_by && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {t('addedAt')} {format(new Date(child.updated_at), 'HH:mm:ss')} {t('by')} {child.updated_by.first_name} {child.updated_by.last_name}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  ))}
                </Box>
              </Paper>
            )}

            {/* Waiting List */}
            <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: '#e3f2fd', border: '2px solid #2196f3' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={t('waitingList')} color="info" />
              </Typography>
              {memoizedScheduleData.waiting_list && memoizedScheduleData.waiting_list.length > 0 ? (
                <Box component="ul" sx={{ pl: 2, mt: 2 }}>
                  {memoizedScheduleData.waiting_list.map(child => (
                    <li key={child.id} style={{ marginBottom: '8px' }}>
                      <Box>
                        <Typography variant="body1">
                          {child.urgency_level === 'urgent' ? '🔥 ' : '⭐ '}
                          <strong>{child.name}</strong> (Group {child.assigned_group})
                          {child.parent_message && (
                            <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
                              - {child.parent_message}
                            </Typography>
                          )}
                        </Typography>
                        {child.updated_at && child.updated_by && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Added at {format(new Date(child.updated_at), 'HH:mm:ss')} by {child.updated_by.first_name} {child.updated_by.last_name}
                            {child.urgency_level && (
                              <span style={{ marginLeft: '8px', fontWeight: 'bold' }}>
                                ({child.urgency_level === 'urgent' ? t('urgentRequest') : t('flexibleRequest')})
                              </span>
                            )}
                          </Typography>
                        )}
                        {(isStaff || user?.showSlotOccupancy) && child.slot_used_by_child_name && (
                          <Typography 
                            variant="caption" 
                            color="primary" 
                            sx={{ display: 'block', fontStyle: 'italic', mt: 0.5 }}
                          >
                            {t('slotUsedBy').replace('#', child.slot_used_by_child_name)}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                  {t('noChildrenWaitingList')}
                </Typography>
              )}
            </Paper>

            {/* Group Lists Title */}
            <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
              {t('dailyGroupOrder')} {format(selectedDate, 'EEEE', { locale: language === 'de' ? de : undefined })}, {format(selectedDate, 'dd.MM.yyyy')}
            </Typography>

            {/* Group Cards */}
            <Grid container spacing={3}>
              {memoizedScheduleData.groups.map((groupData, index) => (
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
                          {t('group')} {groupData.group}
                        </Typography>
                        <Chip 
                          label={groupData.canAttend ? t('attending') : t('stayHome')} 
                          color={groupData.canAttend ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {t('priority')}: #{index + 1}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                        {groupData.children.length} {t('children')}:
                      </Typography>
                      {groupData.children.length > 0 ? (
                        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                          {groupData.children.map(child => {
                            // Check if this child is in additionally attending list
                            const isAdditionallyAttending = memoizedScheduleData.additionally_attending?.some(ac => ac.id === child.id);
                            // Check if child actually has a slot (group can attend OR additionally attending)
                            const hasSlot = groupData.canAttend || isAdditionallyAttending;
                            
                            return (
                              <li key={child.id} style={{ marginBottom: '8px' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar 
                                    variant="square" 
                                    sx={{ 
                                      width: 24, 
                                      height: 24,
                                      bgcolor: 'transparent'
                                    }}
                                    src={getChildAvatarPath(child.id)}
                                    alt={child.name}
                                  >
                                    <PersonIcon sx={{ fontSize: 16 }} />
                                  </Avatar>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                                    <Typography 
                                      variant="body2"
                                      sx={{
                                        textDecoration: child.attendance_status === 'slot_given_up' ? 'line-through' : 'none',
                                        color: child.attendance_status === 'slot_given_up' ? 'text.secondary' : 'text.primary',
                                        fontStyle: (child.attendance_status === 'waiting_list' && !isAdditionallyAttending) ? 'italic' : 'normal'
                                      }}
                                    >
                                      {child.name}
                                    </Typography>
                                    {(isStaff || user?.showSlotOccupancy) && (child.occupied_slot_from_child_name || child.occupied_slot_from_group) && (
                                      <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                        sx={{ fontSize: '0.65rem', fontStyle: 'italic' }}
                                      >
                                        {child.occupied_slot_from_child_name 
                                          ? t('usingSlotOf').replace('#', child.occupied_slot_from_child_name)
                                          : t('usingFreeSlotFromGroup').replace('#', child.occupied_slot_from_group)
                                        }
                                      </Typography>
                                    )}
                                    {child.attendance_status === 'slot_given_up' && (
                                      <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                        sx={{ fontSize: '0.65rem', fontStyle: 'italic' }}
                                      >
                                        {t('staysHome')}
                                      </Typography>
                                    )}
                                    {child.attendance_status === 'waiting_list' && isAdditionallyAttending && (
                                      <Typography 
                                        variant="caption" 
                                        color="success.main"
                                        sx={{ fontSize: '0.65rem', fontStyle: 'italic' }}
                                      >
                                        {t('additionallyAttendingLabel')}
                                      </Typography>
                                    )}
                                    {child.attendance_status === 'waiting_list' && !isAdditionallyAttending && (
                                      <Typography 
                                        variant="caption" 
                                        color="text.secondary"
                                        sx={{ fontSize: '0.65rem', fontStyle: 'italic' }}
                                      >
                                        {t('onWaitingList')}
                                      </Typography>
                                    )}
                                  </Box>
                                  {/* Staff action buttons */}
                                  {isStaff && !isSelectedDatePast && (
                                    <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                                      {/* Show "Give up slot" button ONLY if child actually has a slot */}
                                      {hasSlot && (!child.attendance_status || child.attendance_status === 'attending') && (
                                        <Tooltip title={t('giveUpSlotForChild').replace('#', child.name)}>
                                          <IconButton
                                            size="small"
                                            color="warning"
                                            onClick={async () => {
                                              if (window.confirm(t('confirmGiveUpSlot').replace('#', child.name))) {
                                                try {
                                                  await attendanceAPI.updateStatus(child.id, format(selectedDate, 'yyyy-MM-dd'), 'slot_given_up', '');
                                                  await fetchSchedule();
                                                  setLastUpdate(Date.now());
                                                } catch (err) {
                                                  console.error('Failed to give up slot:', err);
                                                }
                                              }
                                            }}
                                            sx={{ p: 0.5 }}
                                          >
                                            <CancelIcon sx={{ fontSize: 16 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                      {/* Show "Request slot" buttons if child doesn't have a slot OR gave up slot */}
                                      {(!hasSlot || child.attendance_status === 'slot_given_up' || (child.attendance_status === 'waiting_list' && !isAdditionallyAttending)) && (
                                        <>
                                          <Tooltip title={t('urgentRequestTooltip')}>
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={async () => {
                                                try {
                                                  await attendanceAPI.updateStatus(child.id, format(selectedDate, 'yyyy-MM-dd'), 'waiting_list', '', 'urgent');
                                                  await fetchSchedule();
                                                  setLastUpdate(Date.now());
                                                } catch (err) {
                                                  console.error('Failed to join waiting list:', err);
                                                }
                                              }}
                                              sx={{ p: 0.5 }}
                                            >
                                              <span style={{ fontSize: '14px' }}>🔥</span>
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title={t('flexibleRequestTooltip')}>
                                            <IconButton
                                              size="small"
                                              color="primary"
                                              onClick={async () => {
                                                try {
                                                  await attendanceAPI.updateStatus(child.id, format(selectedDate, 'yyyy-MM-dd'), 'waiting_list', '', 'flexible');
                                                  await fetchSchedule();
                                                  setLastUpdate(Date.now());
                                                } catch (err) {
                                                  console.error('Failed to join waiting list:', err);
                                                }
                                              }}
                                              sx={{ p: 0.5 }}
                                            >
                                              <span style={{ fontSize: '14px' }}>⭐</span>
                                            </IconButton>
                                          </Tooltip>
                                        </>
                                      )}
                                      {/* Show "Remove from waiting list" button if child is on waiting list */}
                                      {child.attendance_status === 'waiting_list' && !isAdditionallyAttending && (
                                        <Tooltip title={t('removeFromWaitingList')}>
                                          <IconButton
                                            size="small"
                                            color="default"
                                            onClick={async () => {
                                              try {
                                                await attendanceAPI.updateStatus(child.id, format(selectedDate, 'yyyy-MM-dd'), 'remove_waiting_list', '');
                                                await fetchSchedule();
                                                setLastUpdate(Date.now());
                                              } catch (err) {
                                                console.error('Failed to remove from waiting list:', err);
                                              }
                                            }}
                                            sx={{ p: 0.5 }}
                                          >
                                            <CancelIcon sx={{ fontSize: 16 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  )}
                                </Box>
                              </li>
                            );
                          })}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          {t('noChildren')}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        ) : (
          <Typography>No schedule data available</Typography>
        )}
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Activity Log Drawer */}
      <Drawer
        anchor="right"
        open={activityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 400 }
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {t('activityLog.title')}
            </Typography>
            <IconButton onClick={() => setActivityDrawerOpen(false)} edge="end">
              <ArrowForwardIcon />
            </IconButton>
          </Box>
          <ActivityLog activities={activities} loading={activitiesLoading} />
        </Box>
      </Drawer>

      {/* Slot Lost Modal Dialog */}
      <Dialog 
        open={slotLostAlert !== null} 
        onClose={() => setSlotLostAlert(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#ff9800', color: 'white' }}>
          {slotLostAlert?.children.length === 1 ? t('slotLostTitle') : t('slotLostTitleMultiple')}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {slotLostAlert && slotLostAlert.children.length === 1 ? (
            <Typography variant="body1">
              {t('slotLostMessage', { 
                childName: slotLostAlert.children[0].childName, 
                group: slotLostAlert.children[0].group,
                date: format(slotLostAlert.date, 'EEEE, dd.MM.yyyy', { locale: language === 'de' ? de : undefined })
              })}
            </Typography>
          ) : slotLostAlert && slotLostAlert.children.length > 1 ? (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {t('slotLostMessageMultiple', {
                  date: format(slotLostAlert.date, 'EEEE, dd.MM.yyyy', { locale: language === 'de' ? de : undefined })
                })}
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                {slotLostAlert.children.map((alert, index) => (
                  <li key={index}>
                    <Typography variant="body1">
                      <strong>{alert.childName}</strong> ({t('group')} {alert.group})
                    </Typography>
                  </li>
                ))}
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSlotLostAlert(null)} color="primary" variant="contained">
            {t('confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MainSchedule;
