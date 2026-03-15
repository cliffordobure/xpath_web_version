import { Box, Typography, Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { doctorsApi, settingsApi } from '../api/endpoints';
import { formatPrice } from '../utils/currency';
import { useAuthStore } from '../stores/authStore';

function getPatientName(patient: { firstName?: string; lastName?: string } | string): string {
  if (!patient || typeof patient !== 'object') return '—';
  const first = patient.firstName ?? '';
  const last = patient.lastName ?? '';
  return [first, last].filter(Boolean).join(' ') || '—';
}

export default function DoctorPortal() {
  const { user } = useAuthStore();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  });
  const currency = settings?.currency ?? 'USD';
  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: doctorsApi.getMyProfile,
  });
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['doctor-stats'],
    queryFn: doctorsApi.getMyStats,
  });

  if (profileError || (profileLoading && !stats)) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Referrer portal</Typography>
        <Alert severity="info">
          Your user account is not linked to a doctor/clinic record yet. Ask an administrator to create your referrer profile and link it to your account so you can see referral statistics here.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
        Referrer portal
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {profile?.name} — your referral statistics. Use this for rewards and tracking.
      </Typography>

      {(statsLoading || !stats) ? (
        <Typography color="text.secondary">Loading statistics…</Typography>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ bgcolor: 'primary.50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AssignmentIcon color="primary" />
                    <Typography color="text.secondary">Total referrals</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700}>{stats.totalReferrals}</Typography>
                  <Typography variant="caption" color="text.secondary">Orders attributed to you</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ bgcolor: 'success.50' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <AttachMoneyIcon color="success" />
                    <Typography color="text.secondary">Total revenue (paid)</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="success.dark">
                    {typeof stats.totalRevenue === 'number' ? formatPrice(stats.totalRevenue, currency) : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">From completed payments on your referrals</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TrendingUpIcon color="action" />
                    <Typography color="text.secondary">By month</Typography>
                  </Box>
                  <Box sx={{ maxHeight: 120, overflow: 'auto' }}>
                    {stats.byMonth?.length ? (
                      stats.byMonth.map(({ month, count }) => (
                        <Typography key={month} variant="body2">
                          {month}: <strong>{count}</strong> referral{count !== 1 ? 's' : ''}
                        </Typography>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">No data yet</Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Recent referrals</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Patient</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.recentOrders?.length ? (
                  stats.recentOrders.map((order: { _id: string; orderNumber?: string; patient?: { firstName?: string; lastName?: string }; status?: string; createdAt?: string }) => (
                    <TableRow key={order._id}>
                      <TableCell>{order.orderNumber ?? order._id}</TableCell>
                      <TableCell>{getPatientName(order.patient as { firstName?: string; lastName?: string })}</TableCell>
                      <TableCell>{order.status ?? '—'}</TableCell>
                      <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4}>No referrals yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
