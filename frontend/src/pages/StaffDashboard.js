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
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { childrenAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function StaffDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  useEffect(() => {
    fetchChildren();
  }, []);

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

    try {
      if (editChild) {
        await childrenAPI.update(editChild.id, {
          name: formData.name,
          assignedGroup: formData.assignedGroup
        });
        setSuccess('Child updated successfully');
      } else {
        const response = await childrenAPI.create({
          name: formData.name,
          assignedGroup: formData.assignedGroup
        });
        setSuccess(`Child created! Registration code: ${response.data.child.registrationCode}`);
      }
      handleCloseDialog();
      fetchChildren();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await childrenAPI.delete(id);
        setSuccess('Child deleted successfully');
        fetchChildren();
      } catch (err) {
        setError('Failed to delete child');
      }
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Registration code ${code} copied to clipboard!`);
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
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Staff Dashboard - Child Management
          </Typography>
          <Typography variant="body1">
            {user?.firstName} {user?.lastName}
          </Typography>
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
                label={`Group ${group}: ${groupCounts[group]} children`}
                color="primary"
                variant="outlined"
              />
            ))}
            <Chip
              label={`Total: ${children.length} children`}
              color="secondary"
            />
          </Box>
        </Paper>

        {/* Children Table */}
        <Paper elevation={3}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              All Children
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Add Child
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Group</TableCell>
                  <TableCell>Registration Code</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">Loading...</TableCell>
                  </TableRow>
                ) : children.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No children registered</TableCell>
                  </TableRow>
                ) : (
                  children.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell>{child.name}</TableCell>
                      <TableCell>
                        <Chip label={child.assigned_group} size="small" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <code>{child.registration_code}</code>
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopyCode(child.registration_code)}
                            title="Copy code"
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
                          title="Edit"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(child.id, child.name)}
                          title="Delete"
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
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editChild ? 'Edit Child' : 'Add New Child'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                label="Child Name"
                fullWidth
                margin="normal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Assigned Group</InputLabel>
                <Select
                  value={formData.assignedGroup}
                  onChange={(e) => setFormData({ ...formData, assignedGroup: e.target.value })}
                  label="Assigned Group"
                >
                  <MenuItem value="A">Group A</MenuItem>
                  <MenuItem value="B">Group B</MenuItem>
                  <MenuItem value="C">Group C</MenuItem>
                  <MenuItem value="D">Group D</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              disabled={!formData.name}
            >
              {editChild ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default StaffDashboard;
