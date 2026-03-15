import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Divider,
} from '@mui/material';
import { useAuthStore } from '../stores/authStore';
import { usersApi } from '../api/endpoints';

export default function Settings() {
  const { user, token, setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.name !== undefined) setName(user.name);
  }, [user?.name]);

  const updateMe = useMutation({
    mutationFn: (data: { name?: string; currentPassword?: string; newPassword?: string }) =>
      usersApi.updateMe(data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      if (token && updatedUser) setAuth(updatedUser, token);
      setMessage({ type: 'success', text: 'Profile updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setMessage({ type: 'error', text: e.response?.data?.message || 'Update failed' }),
  });

  const handleSaveProfile = () => {
    setMessage(null);
    const payload: { name?: string; currentPassword?: string; newPassword?: string } = {};
    if (name.trim() !== user?.name) payload.name = name.trim();
    if (newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setMessage({ type: 'error', text: 'New password and confirmation do not match.' });
        return;
      }
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }
    if (Object.keys(payload).length === 0) {
      setMessage({ type: 'error', text: 'No changes to save.' });
      return;
    }
    updateMe.mutate(payload);
  };

  const canSave =
    (name.trim() !== (user?.name ?? '')) ||
    (newPassword.trim().length >= 6 &&
      newPassword === confirmPassword &&
      currentPassword.trim().length > 0);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        My account
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Update your name and password. Changes apply to all portals for your user.
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Profile
          </Typography>
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            placeholder="Your display name"
          />
          <TextField
            fullWidth
            label="Email"
            value={user?.email ?? ''}
            margin="normal"
            disabled
            helperText="Email cannot be changed here. Contact an administrator if needed."
          />
          <TextField
            fullWidth
            label="Role"
            value={user?.role ?? ''}
            margin="normal"
            disabled
          />

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Change password
          </Typography>
          <TextField
            fullWidth
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
            placeholder="Required only when setting a new password"
            autoComplete="current-password"
          />
          <TextField
            fullWidth
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            placeholder="Min 6 characters"
            autoComplete="new-password"
            helperText={newPassword.trim() && newPassword.length < 6 ? 'At least 6 characters required' : ''}
          />
          <TextField
            fullWidth
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            margin="normal"
            placeholder="Re-enter new password"
            autoComplete="new-password"
          />

          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={!canSave || updateMe.isPending}
            sx={{ mt: 2 }}
          >
            {updateMe.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
