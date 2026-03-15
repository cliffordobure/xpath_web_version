import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { samplesApi } from '../../api/endpoints';

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sample, isLoading } = useQuery({
    queryKey: ['sample', id],
    queryFn: () => samplesApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  if (!id || isLoading || !sample) return <Box><Typography>Loading…</Typography></Box>;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/inventory')} sx={{ mb: 2 }}>Back to inventory</Button>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>Sample {sample.label}</Typography>
      <Card>
        <CardContent>
          <Typography variant="body2"><strong>Type:</strong> {sample.type || '—'}</Typography>
          <Typography variant="body2"><strong>Status:</strong> {sample.status}</Typography>
          <Typography variant="body2"><strong>Location:</strong> {sample.location || '—'}</Typography>
          {sample.receivedAt && <Typography variant="body2"><strong>Received:</strong> {new Date(sample.receivedAt).toLocaleString()}</Typography>}
          {sample.notes && <Typography variant="body2"><strong>Notes:</strong> {sample.notes}</Typography>}
        </CardContent>
      </Card>
    </Box>
  );
}
