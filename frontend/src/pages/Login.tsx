import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Box, Card, TextField, Button, Typography, Alert, InputAdornment } from '@mui/material';
import { Logo } from '../components/Logo';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const login = useMutation({
    mutationFn: () => authApi.login(email, password).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      // Send admin to admin section; others to the requested page or dashboard
      const destination =
        data.user?.role === 'admin'
          ? '/admin/users'
          : from === '/' || from === '/login'
            ? '/'
            : from;
      navigate(destination, { replace: true });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main',
        background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #0d47a1 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', p: 4, borderRadius: 2 }}>
        <Logo height={48} sx={{ mb: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Laboratory Information Management System
        </Typography>
        <form onSubmit={handleSubmit}>
          {login.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(login.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid credentials'}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            margin="normal"
            InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" /></InputAdornment> }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            margin="normal"
            InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" /></InputAdornment> }}
          />
          <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3, py: 1.5 }} disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Don't have an account? <Link to="/register" style={{ color: 'inherit', fontWeight: 600 }}>Register</Link>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
          <Link to="/patient-portal" style={{ color: 'primary.main', fontWeight: 600 }}>Patient? Look up your test results</Link>
        </Typography>
      </Card>
    </Box>
  );
}
