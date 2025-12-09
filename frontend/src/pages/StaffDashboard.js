import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  Avatar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonIcon from '@mui/icons-material/Person';
import LanguageIcon from '@mui/icons-material/Language';
import WarningIcon from '@mui/icons-material/Warning';
import { childrenAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getChildAvatarPath } from '../utils/animalAvatars';

function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const nameInputRef = useRef(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editChild, setEditChild] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    assignedGroup: 'A'
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    childId: null,
    childName: '',
    affectedParents: [],
    loading: false
  });

  useEffect(() => {
    fetchChildren();
  }, []);

  const handleDialogEntered = () => {
    // Focus the input after dialog transition completes
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const response = await childrenAPI.getAll();
      setChildren(response.data);
    } catch (err) {
      setError('Failed to load children');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (child = null) => {
    if (child) {
      setEditChild(child);
      setFormData({
        name: child.name,
        assignedGroup: child.assigned_group
      });
    } else {
      setEditChild(null);
      setFormData({
        name: '',
        assignedGroup: 'A'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditChild(null);
    setFormData({ name: '', assignedGroup: 'A' });
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!formData.name) return; // Don't submit if name is empty

    // Check for duplicate names
    const nameExists = children.some(child => 
      child.name.toLowerCase() === formData.name.toLowerCase() && 
      (!editChild || child.id !== editChild.id)
    );

    if (nameExists) {
      setError(`A child with the name "${formData.name}" already exists.`);
      return;
    }

    try {
      if (editChild) {
        await childrenAPI.update(editChild.id, {
          name: formData.name,
          assignedGroup: formData.assignedGroup
        });
        setSuccess(t('childUpdatedSuccess'));
      } else {
        const response = await childrenAPI.create({
          name: formData.name,
          assignedGroup: formData.assignedGroup
        });
        setSuccess(`${t('childCreatedSuccess')}! ${t('registrationCodeLabel')}: ${response.data.child.registrationCode}`);
      }
      handleCloseDialog();
      fetchChildren();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && formData.name) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDeleteClick = async (id, name) => {
    setDeleteDialog(prev => ({ ...prev, loading: true, open: true, childId: id, childName: name }));
    
    try {
      const response = await childrenAPI.checkDeletionImpact(id);
      setDeleteDialog({
        open: true,
        childId: id,
        childName: name,
        affectedParents: response.data.affectedParents || [],
        loading: false
      });
    } catch (err) {
      setError('Failed to check deletion impact');
      setDeleteDialog({ open: false, childId: null, childName: '', affectedParents: [], loading: false });
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteDialog(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await childrenAPI.delete(deleteDialog.childId);
      
      let successMsg = t('childDeletedSuccess');
      if (response.data.deletedParentAccounts > 0) {
        successMsg += ` ${t('parentAccountsDeleted').replace('#', response.data.deletedParentAccounts)}`;
      }
      
      setSuccess(successMsg);
      fetchChildren();
      setDeleteDialog({ open: false, childId: null, childName: '', affectedParents: [], loading: false });
    } catch (err) {
      setError(t('failedToUpdateProfile'));
      setDeleteDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, childId: null, childName: '', affectedParents: [], loading: false });
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setSuccess(t('codeCopied'));
  };

  const groupCounts = {
    A: children.filter(c => c.assigned_group === 'A').length,
    B: children.filter(c => c.assigned_group === 'B').length,
    C: children.filter(c => c.assigned_group === 'C').length,
    D: children.filter(c => c.assigned_group === 'D').length
  };

  return (
    <Box>
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
            {t('staffDashboard')}
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

        {/* Group Statistics */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Group Statistics
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {['A', 'B', 'C', 'D'].map(group => (
              <Chip
                key={group}
                label={`${t('group')} ${group}: ${groupCounts[group]} ${t('children')}`}
                color="primary"
                variant="outlined"
              />
            ))}
            <Chip
              label={`${t('totalChildren')} ${children.length} ${t('childrenCount')}`}
              color="secondary"
            />
          </Box>
        </Paper>

        {/* Children Table */}
        <Paper elevation={3}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {t('allChildren')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              {t('addChild')}
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('childName')}</TableCell>
                  <TableCell>{t('group')}</TableCell>
                  <TableCell>{t('parents')}</TableCell>
                  <TableCell>{t('parentContact')}</TableCell>
                  <TableCell>{t('registrationCodeLabel')}</TableCell>
                  <TableCell>{t('createdBy')}</TableCell>
                  <TableCell>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">{t('loading')}</TableCell>
                  </TableRow>
                ) : children.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">{t('noChildrenRegistered')}</TableCell>
                  </TableRow>
                ) : (
                  children.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar 
                            variant="square" 
                            sx={{ width: 32, height: 32, bgcolor: 'transparent' }}
                            src={getChildAvatarPath(child.id)}
                            alt={child.name}
                          >
                            <PersonIcon fontSize="small" />
                          </Avatar>
                          {child.name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={child.assigned_group} size="small" color="primary" />
                      </TableCell>
                      <TableCell>
                        {child.parents && child.parents.length > 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {child.parents.map((parent, idx) => (
                              <Typography key={parent.id} variant="body2">
                                {parent.first_name} {parent.last_name}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            {t('noParentsLinked')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {child.parents && child.parents.length > 0 ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {child.parents.map((parent, idx) => (
                              <Box key={parent.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                  {parent.email}
                                </Typography>
                                {parent.phone && (
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                    {parent.phone}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <code>{child.registration_code}</code>
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopyCode(child.registration_code)}
                            title={t('copyCode')}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {child.created_by_first_name} {child.created_by_last_name}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDialog(child)}
                          title={t('edit')}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(child.id, child.name)}
                          title={t('delete')}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Add/Edit Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          maxWidth="sm" 
          fullWidth
          TransitionProps={{
            onEntered: handleDialogEntered
          }}
        >
          <DialogTitle>
            {editChild ? t('editChildTitle') : t('addChildTitle')}
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box sx={{ pt: 2 }}>
              <TextField
                inputRef={nameInputRef}
                label={t('childNameLabel')}
                fullWidth
                margin="normal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onKeyPress={handleKeyPress}
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>{t('assignedGroup')}</InputLabel>
                <Select
                  value={formData.assignedGroup}
                  onChange={(e) => setFormData({ ...formData, assignedGroup: e.target.value })}
                  onKeyPress={handleKeyPress}
                  label={t('assignedGroup')}
                >
                  <MenuItem value="A">{t('group')} A</MenuItem>
                  <MenuItem value="B">{t('group')} B</MenuItem>
                  <MenuItem value="C">{t('group')} C</MenuItem>
                  <MenuItem value="D">{t('group')} D</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>{t('cancel')}</Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              disabled={!formData.name}
            >
              {editChild ? t('save') : t('add')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog.open} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon color="warning" />
              {t('confirmDeleteChildTitle')}
            </Box>
          </DialogTitle>
          <DialogContent>
            {deleteDialog.loading ? (
              <Typography>{t('loading')}</Typography>
            ) : (
              <>
                <Typography variant="body1" gutterBottom>
                  {t('confirmDeleteChildMessage').replace('#', deleteDialog.childName)}
                </Typography>
                
                {deleteDialog.affectedParents.length > 0 && (
                  <>
                    <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {t('deleteChildWarningParentAccounts')}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {t('deleteChildAffectedParents').replace('#', deleteDialog.affectedParents.length)}
                      </Typography>
                      <Box component="ul" sx={{ mt: 1, mb: 1, pl: 2 }}>
                        {deleteDialog.affectedParents.map(parent => (
                          <li key={parent.id}>
                            <Typography variant="body2">
                              {parent.firstName} {parent.lastName} ({parent.email})
                            </Typography>
                          </li>
                        ))}
                      </Box>
                      <Typography variant="body2">
                        {t('deleteChildEmailNotification')}
                      </Typography>
                    </Alert>
                  </>
                )}

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {t('deleteChildIrreversible')}
                </Typography>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} disabled={deleteDialog.loading}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              disabled={deleteDialog.loading}
            >
              {deleteDialog.loading ? t('deleting') : t('deleteChild')}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default StaffDashboard;
