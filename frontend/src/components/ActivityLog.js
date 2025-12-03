import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Box,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  GroupAdd as GroupAddIcon,
  GroupRemove as GroupRemoveIcon,
  SwapHoriz as SwapIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  HourglassEmpty as WaitingIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useLanguage } from '../contexts/LanguageContext';

const ActivityLog = ({ activities, loading }) => {
  const { t } = useLanguage();

  const getActivityIcon = (eventType) => {
    switch (eventType) {
      case 'capacity_change':
        return <ScheduleIcon />;
      case 'rotation_change':
        return <SwapIcon />;
      case 'slot_given_up':
        return <CancelIcon />;
      case 'slot_requested':
        return <PersonIcon />;
      case 'waiting_list_joined':
        return <WaitingIcon />;
      case 'waiting_list_removed':
        return <GroupRemoveIcon />;
      case 'auto_assigned':
        return <CheckIcon />;
      case 'slot_restored':
        return <GroupAddIcon />;
      default:
        return <TimeIcon />;
    }
  };

  const getActivityColor = (eventType) => {
    switch (eventType) {
      case 'capacity_change':
      case 'rotation_change':
        return 'primary';
      case 'slot_given_up':
      case 'waiting_list_removed':
        return 'error';
      case 'waiting_list_joined':
        return 'warning';
      case 'auto_assigned':
      case 'slot_restored':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatActivityText = (activity) => {
    const { event_type, child_name, user_name, metadata } = activity;
    const timestamp = format(new Date(activity.created_at), 'HH:mm:ss');
    
    // Build translation key from event_type
    const translationKey = `activityLog.${event_type}`;
    
    // Prepare translation parameters
    const params = {
      child: child_name || metadata?.child_name,
      user: user_name,
      from: metadata?.old_capacity,
      to: metadata?.new_capacity
    };
    
    // Get translated text
    const userAction = t(translationKey, params);
    
    return `${timestamp} - ${userAction}`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, height: '100%' }}>
        <Typography color="text.secondary">
          {t('loading')}
        </Typography>
      </Box>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Box sx={{ p: 2, height: '100%' }}>
        <Typography color="text.secondary">
          {t('activityLog.noEvents')}
        </Typography>
      </Box>
    );
  }

  // Sort activities in reverse chronological order (newest first)
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <List sx={{ pt: 0 }}>
        {sortedActivities.map((activity, index) => (
          <React.Fragment key={activity.id || index}>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: `${getActivityColor(activity.event_type)}.main` }}>
                  {getActivityIcon(activity.event_type)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body2" component="span">
                    {formatActivityText(activity)}
                  </Typography>
                }
                secondary={
                  activity.metadata?.group && (
                    <Chip 
                      label={`Group ${activity.metadata.group}`} 
                      size="small" 
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  )
                }
              />
            </ListItem>
            {index < sortedActivities.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default ActivityLog;
