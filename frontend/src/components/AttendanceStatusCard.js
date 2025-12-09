import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Box,
  Tooltip,
  Stack
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { format } from 'date-fns';
import { attendanceAPI } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { getChildAvatarPath } from '../utils/animalAvatars';
import { isPastDate } from '../utils/dateValidation';

function AttendanceStatusCard({ child, selectedDate, canAttend, isAdditionallyAttending, lastUpdate, onStatusChange }) {
  const { t } = useLanguage();
  const isPast = isPastDate(selectedDate);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [parentMessage, setParentMessage] = useState('');
  const [actionType, setActionType] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('urgent');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const loadStatus = useCallback(async () => {
    try {
      const response = await attendanceAPI.getStatus(child.id, dateStr);
      setStatus(response.data);
    } catch (err) {
      console.error('Failed to load attendance status:', err);
    }
  }, [child.id, dateStr]);

  // Reload status when component mounts, date changes, or when parent signals update via lastUpdate
  useEffect(() => {
    loadStatus();
  }, [loadStatus, lastUpdate]);

  const handleOpenDialog = (action, urgency = 'urgent') => {
    setActionType(action);
    setUrgencyLevel(urgency);
    setParentMessage('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setParentMessage('');
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      let newStatus = actionType; // Use actionType directly as it matches the status enum
      
      await attendanceAPI.updateStatus(child.id, dateStr, newStatus, parentMessage, urgencyLevel);
      await loadStatus();
      handleCloseDialog();
      
      // Trigger parent refresh to update group lists immediately
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (err) {
      setError('Failed to update attendance status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return null;
  }

  const currentStatus = status.status;
  const isSlotGivenUp = currentStatus === 'slot_given_up';
  const isWaitingList = currentStatus === 'waiting_list';
  const isAttending = currentStatus === 'attending';

  // Determine what to show based on group eligibility and current status
  let statusMessage = '';
  let statusDetails = '';
  let buttonText = '';
  let buttonAction = '';
  let severity = 'success';

  if (isSlotGivenUp) {
    statusMessage = `${child.name} ${t('doesNotHaveSlot')}`;
    statusDetails = `${t('slotYieldedBy')} ${status.updated_by.first_name} ${status.updated_by.last_name} ${t('at')} ${format(new Date(status.updated_at), 'HH:mm:ss dd.MM.yyyy')}`;
    if (status.parent_message) {
      statusDetails += `\n${status.parent_message}`;
    }
    buttonText = `${child.name} ${t('needsDayCareSport')}`;
    buttonAction = 'waiting_list';
    severity = 'warning';
  } else if (isWaitingList) {
    statusMessage = `${child.name} ${t('isOnWaitingList')}`;
    statusDetails = `${t('addedAt')} ${format(new Date(status.updated_at), 'HH:mm:ss')} ${t('by')} ${status.updated_by.first_name} ${status.updated_by.last_name}`;
    if (status.parent_message) {
      statusDetails += `\n${status.parent_message}`;
    }
    buttonText = t('removeFromWaitingList');
    buttonAction = 'remove_waiting_list';
    severity = 'info';
  } else if (isAttending && (canAttend || isAdditionallyAttending)) {
    // Child is attending AND (their group is allowed OR they're in additionally_attending list)
    statusMessage = `${child.name} ${t('canAttendToday')}`;
    buttonText = `${child.name} ${t('willNotAttendToday')}`;
    buttonAction = 'slot_given_up';
    severity = 'success';
  } else if (isAttending && !canAttend && !isAdditionallyAttending) {
    // Child's status is "attending" but they're NOT actually attending
    // (their group is excluded AND they're not in additionally_attending)
    // This means their slot was taken or they were bumped off
    statusMessage = `${child.name}${t('groupNotAttending')}`;
    statusDetails = t('capacityReduced');
    buttonText = `${child.name} ${t('needsDayCareSport')}`;
    buttonAction = 'waiting_list';
    severity = 'warning';
  } else if (!canAttend) {
    // Group is not attending and child doesn't have attending status
    statusMessage = `${child.name}${t('groupNotAttending')}`;
    buttonText = `${child.name} ${t('needsDayCareSport')}`;
    buttonAction = 'waiting_list';
    severity = 'warning';
  }

  return (
    <>
      <Card sx={{ mb: 2, border: `2px solid ${severity === 'success' ? '#4caf50' : severity === 'warning' ? '#ff9800' : '#2196f3'}` }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar 
              variant="square"
              sx={{ 
                width: 48, 
                height: 48, 
                mr: 2,
                bgcolor: 'transparent'
              }}
              src={getChildAvatarPath(child.id)}
              alt={child.name}
            >
              <PersonIcon />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {child.name} (Group {child.assigned_group})
            </Typography>
          </Box>          <Alert severity={severity} sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {statusMessage}
            </Typography>
            {statusDetails && (
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
                {statusDetails}
              </Typography>
            )}
          </Alert>

          {buttonAction === 'waiting_list' ? (
            <Stack spacing={1}>
              <Tooltip title={isPast ? t('cannotModifyPastDates') : t('urgentRequestTooltip')} placement="top">
                <span>
                  <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    onClick={() => handleOpenDialog('waiting_list', 'urgent')}
                    startIcon={<span>🔥</span>}
                    disabled={isPast}
                  >
                    {t('needsDayCareSportUrgent').replace('#', child.name)}
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title={isPast ? t('cannotModifyPastDates') : t('flexibleRequestTooltip')} placement="top">
                <span>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={() => handleOpenDialog('waiting_list', 'flexible')}
                    startIcon={<span>⭐</span>}
                    disabled={isPast}
                  >
                    {t('wouldLikeDayCareSport').replace('#', child.name)}
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          ) : (
            <Tooltip title={isPast ? t('cannotModifyPastDates') : ''} placement="top">
              <span>
                <Button
                  variant="contained"
                  color={buttonAction === 'give_up' ? 'warning' : 'primary'}
                  fullWidth
                  onClick={() => handleOpenDialog(buttonAction)}
                  disabled={isPast}
                >
                  {buttonText}
                </Button>
              </span>
            </Tooltip>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'slot_given_up' ? t('giveUpSlot') : 
           actionType === 'waiting_list' ? t('joinWaitingList') : 
           actionType === 'remove_waiting_list' ? t('removeFromWaitingList') :
           t('updateStatus')}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body1" gutterBottom>
            {actionType === 'slot_given_up' ? 
              t('confirmGiveUpSlot').replace('#', child.name) :
             actionType === 'waiting_list' ?
              t('confirmJoinWaitingList').replace('#', child.name) :
             actionType === 'remove_waiting_list' ?
              t('confirmRemoveWaitingList').replace('#', child.name) :
              ''
            }
          </Typography>

          <TextField
            label={t('optionalMessage')}
            multiline
            rows={3}
            fullWidth
            value={parentMessage}
            onChange={(e) => setParentMessage(e.target.value)}
            sx={{ mt: 2 }}
            placeholder={t('additionalInfo')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('cancel')}</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={loading}
            color={actionType === 'slot_given_up' ? 'warning' : 'primary'}
          >
            {t('confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AttendanceStatusCard;
