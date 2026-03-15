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
  Switch,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { useAuthStore } from '../../stores/authStore';
import { usersApi } from '../../api/endpoints';
import type { User } from '../../api/endpoints';

const ROLE_LABELS: Record<User['role'], string> = {
  receptionist: 'Receptionist',
  technician: 'Lab Technician',
  pathologist: 'Pathologist',
  admin: 'System Admin',
  finance: 'Finance',
  courier: 'Courier',
  doctor: 'Doctor / Referrer',
};

export default function AdminUsers() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'receptionist' as User['role'], active: true });
  const [editForm, setEditForm] = useState({ name: '', role: 'receptionist' as User['role'], active: true, newPassword: '' });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
  });
  const rows = Array.isArray(users) ? users : [];

  const createMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: User['role']; active?: boolean }) =>
      usersApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreateOpen(false);
      setForm({ name: '', email: '', password: '', role: 'receptionist', active: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; role?: User['role']; active?: boolean; password?: string } }) =>
      usersApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      active: form.active,
    });
  };

  const handleEditOpen = (u: User) => {
    setEditUser(u);
    setEditForm({ name: u.name, role: u.role, active: u.active !== false, newPassword: '' });
  };

  const handleEditSave = () => {
    if (!editUser) return;
    const data: { name?: string; role?: User['role']; active?: boolean; password?: string } = {
      name: editForm.name,
      role: editForm.role,
      active: editForm.active,
    };
    if (editForm.newPassword.trim()) data.password = editForm.newPassword;
    updateMutation.mutate({ id: editUser._id, data });
  };

  if (!isAdmin) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>User management</Typography>
        <Typography color="text.secondary">Only system administrators can manage users.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          User management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Create user
        </Button>
      </Box>
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>
              ) : (
                rows.map((u: User) => (
                  <TableRow key={u._id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Chip label={ROLE_LABELS[u.role]} size="small" color={u.role === 'admin' ? 'primary' : 'default'} /></TableCell>
                    <TableCell>{u.active !== false ? 'Yes' : 'No'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit user">
                        <IconButton size="small" onClick={() => handleEditOpen(u)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create user dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create new user</DialogTitle>
        <DialogContent>
          {createMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(createMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create user'}
            </Alert>
          )}
          <TextField fullWidth label="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} margin="normal" required />
          <TextField fullWidth label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} margin="normal" required />
          <TextField fullWidth label="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} margin="normal" required helperText="Min 6 characters" />
          <TextField fullWidth select label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as User['role'] }))} margin="normal">
            {(Object.keys(ROLE_LABELS) as User['role'][]).map((r) => (
              <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>
            ))}
          </TextField>
          <FormControlLabel control={<Switch checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />} label="Active" sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.name || !form.email || form.password.length < 6 || createMutation.isPending}>
            Create user
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit user</DialogTitle>
        <DialogContent>
          {updateMutation.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(updateMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update user'}
            </Alert>
          )}
          {editUser && (
            <>
              <TextField fullWidth label="Full name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} margin="normal" />
              <TextField fullWidth label="Email" value={editUser.email} margin="normal" disabled />
              <TextField fullWidth select label="Role" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as User['role'] }))} margin="normal">
                {(Object.keys(ROLE_LABELS) as User['role'][]).map((r) => (
                  <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>
                ))}
              </TextField>
              <TextField fullWidth label="New password (leave blank to keep)" type="password" value={editForm.newPassword} onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))} margin="normal" />
              <FormControlLabel control={<Switch checked={editForm.active} onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))} />} label="Active" sx={{ mt: 1 }} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={updateMutation.isPending}>
            Save changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
