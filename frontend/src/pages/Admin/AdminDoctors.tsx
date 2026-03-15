import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useAuthStore } from '../../stores/authStore';
import { doctorsApi } from '../../api/endpoints';
import type { Doctor } from '../../api/endpoints';

const emptyForm = {
  name: '',
  code: '',
  type: 'doctor' as 'doctor' | 'clinic',
  email: '',
  phone: '',
  address: '',
  createUser: false,
  userEmail: '',
  userPassword: '',
};

export default function AdminDoctors() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorsApi.list,
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof doctorsApi.create>[0]) => doctorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof doctorsApi.update>[1] }) =>
      doctorsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setError(e.response?.data?.message || 'Failed to update'),
  });

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const handleOpenEdit = (d: Doctor) => {
    setEditing(d);
    setForm({
      name: d.name,
      code: d.code ?? '',
      type: d.type ?? 'doctor',
      email: d.email ?? '',
      phone: d.phone ?? '',
      address: d.address ?? '',
      createUser: false,
      userEmail: '',
      userPassword: '',
    });
    setError('');
    setOpen(true);
  };

  const handleSubmit = () => {
    setError('');
    if (editing) {
      updateMutation.mutate({
        id: editing._id,
        data: {
          name: form.name.trim(),
          code: form.code.trim() || undefined,
          type: form.type,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
        },
      });
    } else {
      if (!form.name.trim()) {
        setError('Name is required');
        return;
      }
      if (form.createUser && (!form.userEmail.trim() || (form.userPassword?.length ?? 0) < 6)) {
        setError('When creating portal user, email and password (min 6 characters) are required');
        return;
      }
      createMutation.mutate({
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        type: form.type,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        createUser: form.createUser,
        userEmail: form.createUser ? form.userEmail.trim() : undefined,
        userPassword: form.createUser ? form.userPassword : undefined,
      });
    }
  };

  if (!isAdmin) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Doctors &amp; Referrers</Typography>
        <Typography color="text.secondary">Only administrators can manage doctors and clinics.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Doctors &amp; Referrers
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Add doctor / clinic
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Create doctors or clinics for referral tracking. Link a portal user so they can sign in and view their referral statistics. When creating orders, select a referrer to attribute the referral.
      </Typography>
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Portal user</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow>
              ) : (
                doctors.map((d) => (
                  <TableRow key={d._id}>
                    <TableCell><strong>{d.name}</strong></TableCell>
                    <TableCell>{d.code || '—'}</TableCell>
                    <TableCell><Chip size="small" label={d.type} /></TableCell>
                    <TableCell>{d.email || d.phone || '—'}</TableCell>
                    <TableCell>
                      {typeof d.user === 'object' && d.user ? d.user.email : d.user ? 'Linked' : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpenEdit(d)} aria-label="Edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit doctor / clinic' : 'Add doctor / clinic'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="Optional short code"
            fullWidth
          />
          <TextField
            select
            label="Type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'doctor' | 'clinic' }))}
            fullWidth
          >
            <MenuItem value="doctor">Doctor</MenuItem>
            <MenuItem value="clinic">Clinic</MenuItem>
          </TextField>
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            multiline
            minRows={1}
            fullWidth
          />
          {!editing && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.createUser}
                    onChange={(e) => setForm((f) => ({ ...f, createUser: e.target.checked }))}
                  />
                }
                label="Create portal login for this doctor (they can view referral stats)"
              />
              {form.createUser && (
                <>
                  <TextField
                    label="Login email"
                    type="email"
                    value={form.userEmail}
                    onChange={(e) => setForm((f) => ({ ...f, userEmail: e.target.value }))}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Login password"
                    type="password"
                    value={form.userPassword}
                    onChange={(e) => setForm((f) => ({ ...f, userPassword: e.target.value }))}
                    fullWidth
                    required
                    helperText="Min 6 characters"
                  />
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
