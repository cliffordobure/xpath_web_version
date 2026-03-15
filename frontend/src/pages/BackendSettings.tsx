import { useState } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, Alert } from '@mui/material';
import { api } from '../api/client';

const defaultDisplayUrl = import.meta.env.PROD
  ? 'https://xpath-web-version.onrender.com/api'
  : '/api';

export default function BackendSettings() {
  const [url, setUrl] = useState(import.meta.env.VITE_API_URL || defaultDisplayUrl);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const testConnection = async () => {
    setStatus('idle');
    try {
      await api.get('/health');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Backend settings
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>API URL (for reference; actual base URL is set at build time via VITE_API_URL)</Typography>
          <TextField fullWidth label="API base URL" value={url} onChange={(e) => setUrl(e.target.value)} margin="normal" />
          <Button variant="contained" sx={{ mt: 2 }} onClick={testConnection}>Test connection</Button>
          {status === 'success' && <Alert severity="success" sx={{ mt: 2 }}>Connection successful.</Alert>}
          {status === 'error' && <Alert severity="error" sx={{ mt: 2 }}>Connection failed. Check URL and CORS.</Alert>}
        </CardContent>
      </Card>
    </Box>
  );
}
