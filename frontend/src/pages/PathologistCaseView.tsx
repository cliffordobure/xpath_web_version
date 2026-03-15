import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Link,
  TextField,
  Snackbar,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import EditIcon from '@mui/icons-material/Edit';
import { ordersApi, slideImagesApi } from '../api/endpoints';
import type { SlideImage } from '../api/endpoints';

export default function PathologistCaseView() {
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const [diagnosis, setDiagnosis] = useState('');
  const [snackbar, setSnackbar] = useState('');

  const {
    data: order,
    isLoading: orderLoading,
    isError: orderError,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId!).then((r) => r.data),
    enabled: !!orderId,
  });
  const { data: images = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['slide-images', orderId],
    queryFn: () => slideImagesApi.getByOrder(orderId!),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (order?.pathologistDiagnosis !== undefined) setDiagnosis(order.pathologistDiagnosis ?? '');
  }, [order?.pathologistDiagnosis]);

  const saveDraft = useMutation({
    mutationFn: () => ordersApi.update(orderId!, { pathologistDiagnosis: diagnosis }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSnackbar('Draft saved.');
    },
    onError: () => setSnackbar('Failed to save draft.'),
  });
  const lockReport = useMutation({
    mutationFn: () =>
      ordersApi.update(orderId!, {
        pathologistDiagnosis: diagnosis,
        reportLockedAt: new Date().toISOString(),
        status: 'completed',
        completedAt: new Date().toISOString(),
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSnackbar('Report locked and marked complete.');
    },
    onError: () => setSnackbar('Failed to lock report.'),
  });

  if (!orderId) {
    return (
      <Box>
        <Alert severity="warning">No order selected.</Alert>
        <Button component={RouterLink} to="/pathologist-review" sx={{ mt: 2 }}>
          Back to Pathologist review
        </Button>
      </Box>
    );
  }
  if (orderLoading || orderError || !order) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: 'column', py: 4 }}>
        {orderLoading && <CircularProgress />}
        {orderError && <Alert severity="error">Order not found.</Alert>}
        {!orderLoading && !orderError && !order && <Alert severity="info">Loading order…</Alert>}
        <Button component={RouterLink} to="/pathologist-review">
          Back to Pathologist review
        </Button>
      </Box>
    );
  }

  const patient = typeof order.patient === 'object' && order.patient
    ? order.patient
    : null;
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '—';
  const isLocked = !!order.reportLockedAt;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button component={RouterLink} to="/pathologist-review" size="small">
          ← Back to list
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Case: {order.orderNumber}
        </Typography>
        {isLocked && (
          <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LockIcon fontSize="small" /> Report locked
          </Typography>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Order</Typography>
              <Typography variant="body1"><strong>{order.orderNumber}</strong></Typography>
              <Typography variant="body2">Patient: {patientName}</Typography>
              <Typography variant="body2">Status: {order.status}</Typography>
              {order.referringDoctor && (
                <Typography variant="body2">Referring: {order.referringDoctor}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Slide images
              </Typography>
              {imagesLoading && <CircularProgress size={24} sx={{ my: 2 }} />}
              {!imagesLoading && images.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No slide images for this order yet. Images from the scanner (via API) will appear here.
                </Typography>
              )}
              {!imagesLoading && images.length > 0 && (
                <Grid container spacing={2}>
                  {(images as SlideImage[]).map((img) => (
                    <Grid item xs={12} sm={6} md={4} key={img._id}>
                      <Card variant="outlined">
                        <Box
                          component="a"
                          href={img.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ display: 'block', p: 1 }}
                        >
                          <Box
                            component="img"
                            src={img.imageUrl}
                            alt={img.slideId}
                            sx={{
                              width: '100%',
                              height: 180,
                              objectFit: 'contain',
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </Box>
                        <CardContent sx={{ py: 0, '&:last-child': { pb: 2 } }}>
                          <Typography variant="caption" color="text.secondary">
                            {img.slideId}
                            {img.label ? ` — ${img.label}` : ''}
                          </Typography>
                          <Link href={img.imageUrl} target="_blank" rel="noopener noreferrer" variant="body2" display="block" sx={{ mt: 0.5 }}>
                            Open full size
                          </Link>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Review & diagnosis
                {isLocked && <LockIcon color="action" fontSize="small" />}
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={4}
                maxRows={12}
                label="Diagnosis / review"
                placeholder="Enter your review and diagnosis based on the slide images above. Save as draft to continue later, or mark complete & lock when final."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                disabled={isLocked}
                sx={{ mb: 2 }}
              />
              {!isLocked && (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => saveDraft.mutate()}
                    disabled={saveDraft.isPending}
                  >
                    Save as draft
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<LockIcon />}
                    onClick={() => lockReport.mutate()}
                    disabled={lockReport.isPending}
                  >
                    Mark complete & lock
                  </Button>
                </Box>
              )}
              {isLocked && (
                <Typography variant="body2" color="text.secondary">
                  This report is locked. No further edits can be made.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar('')} message={snackbar} />
    </Box>
  );
}
