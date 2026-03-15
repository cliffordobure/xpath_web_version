import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Box, Card, TextField, Button, Typography, Alert, MenuItem } from '@mui/material';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../stores/authStore';

const ROLES = [
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'technician', label: 'Technician' },
  { value: 'pathologist', label: 'Pathologist' },
  { value: 'admin', label: 'Admin' },
  { value: 'finance', label: 'Finance' },
  { value: 'courier', label: 'Courier' },
];

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('receptionist');

  const register = useMutation({
    mutationFn: () => authApi.register({ email, password, name, role }).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      navigate('/', { replace: true });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate();
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.main', p: 2 }}>
      <Card sx={{ maxWidth: 440, width: '100%', p: 4, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
          Create account
        </Typography>
        <form onSubmit={handleSubmit}>
          {register.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {register.error instanceof Error ? register.error.message : 'Registration failed'}
            </Alert>
          )}
          <TextField fullWidth label="Full name" value={name} onChange={(e) => setName(e.target.value)} required margin="normal" />
          <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required margin="normal" />
          <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required margin="normal" helperText="Min 6 characters" />
          <TextField fullWidth select label="Role" value={role} onChange={(e) => setRole(e.target.value)} margin="normal">
            {ROLES.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </TextField>
          <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3, py: 1.5 }} disabled={register.isPending}>
            {register.isPending ? 'Creating…' : 'Register'}
          </Button>
        </form>
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Already have an account? <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>Sign in</Link>
        </Typography>
      </Card>
    </Box>
  );
}
