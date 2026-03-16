import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Grid, Card, CardContent, Button, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaymentsIcon from '@mui/icons-material/Payments';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import ScienceIcon from '@mui/icons-material/Science';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupIcon from '@mui/icons-material/Group';
import { useAuthStore } from '../stores/authStore';
import { ordersApi, paymentsApi, settingsApi } from '../api/endpoints';

const cardSx = {
  borderRadius: 2,
  height: '100%',
  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  '&:hover': {
    boxShadow: 6,
    transform: 'translateY(-2px)',
  },
};

const sectionLabelSx = {
  color: 'text.secondary',
  letterSpacing: 1.5,
  fontWeight: 600,
  fontSize: '0.75rem',
  display: 'block',
  mb: 2,
};

const PORTAL_CONFIG: Record<string, { title: string; subtitle: string; quickActions: { label: string; path: string; icon: React.ReactNode }[] }> = {
  receptionist: {
    title: 'Receptionist Portal',
    subtitle: 'Register patients, create orders, receive samples, and manage payments.',
    quickActions: [
      { label: 'Create order', path: '/orders/create', icon: <AddCircleOutlineIcon /> },
      { label: 'Receptionist workflow', path: '/receptionist/workflow', icon: <PersonSearchIcon /> },
      { label: 'Orders', path: '/orders', icon: <AssignmentIcon /> },
      { label: 'Financial', path: '/financial', icon: <ReceiptIcon /> },
    ],
  },
  technician: {
    title: 'Lab Technician Portal',
    subtitle: 'Receive samples, run workflows, and assign cases to pathologists.',
    quickActions: [
      { label: 'Technician workflow', path: '/technician/workflow', icon: <ScienceIcon /> },
      { label: 'Receiving', path: '/receiving', icon: <PersonSearchIcon /> },
      { label: 'Histology', path: '/histology', icon: <ScienceIcon /> },
      { label: 'IHC', path: '/ihc', icon: <ScienceIcon /> },
      { label: 'Cytology', path: '/cytology', icon: <ScienceIcon /> },
      { label: 'Inventory', path: '/inventory', icon: <AssignmentIcon /> },
    ],
  },
  pathologist: {
    title: 'Pathologist Portal',
    subtitle: 'Review cases, add remarks, and sign off reports.',
    quickActions: [
      { label: 'Pathologist workflow', path: '/pathologist/workflow', icon: <RateReviewIcon /> },
      { label: 'Pathologist review', path: '/pathologist-review', icon: <RateReviewIcon /> },
      { label: 'Reports', path: '/reports', icon: <AssignmentIcon /> },
    ],
  },
  admin: {
    title: 'System Admin Portal',
    subtitle: 'Manage users, test types, workflows, and system settings.',
    quickActions: [
      { label: 'User management', path: '/admin/users', icon: <GroupIcon /> },
      { label: 'Doctors & referrers', path: '/admin/doctors', icon: <PersonSearchIcon /> },
      { label: 'Test types', path: '/admin/test-types', icon: <AssignmentIcon /> },
      { label: 'System settings', path: '/admin/settings', icon: <AdminPanelSettingsIcon /> },
      { label: 'Orders', path: '/orders', icon: <AssignmentIcon /> },
      { label: 'Financial', path: '/financial', icon: <ReceiptIcon /> },
    ],
  },
  finance: {
    title: 'Finance Portal',
    subtitle: 'Payments, transactions, and financial reports.',
    quickActions: [
      { label: 'Financial', path: '/financial', icon: <ReceiptIcon /> },
      { label: 'Reports', path: '/reports', icon: <AssignmentIcon /> },
      { label: 'Orders', path: '/orders', icon: <AssignmentIcon /> },
    ],
  },
  courier: {
    title: 'Courier Portal',
    subtitle: 'View pickup requests and manage your deliveries.',
    quickActions: [
      { label: 'Pickups & deliveries', path: '/courier', icon: <LocalShippingIcon /> },
    ],
  },
  doctor: {
    title: 'Referrer Portal',
    subtitle: 'View your referral statistics and rewards.',
    quickActions: [
      { label: 'Referral statistics', path: '/doctor-portal', icon: <AssignmentIcon /> },
    ],
  },
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const role = user?.role ?? 'receptionist';
  const portal = PORTAL_CONFIG[role] ?? PORTAL_CONFIG.receptionist;

  const pathologistOnly = role === 'pathologist' ? { assignedToMePathologist: true } : {};
  const showFinancial = role === 'admin' || role === 'finance';
  const isCourier = role === 'courier';
  const isDoctor = role === 'doctor';

  const { data: ordersData } = useQuery({
    queryKey: ['orders', { limit: 5 }, pathologistOnly, isCourier],
    queryFn: () => ordersApi.list({ limit: 5, ...pathologistOnly }).then((r) => r.data),
    enabled: !isCourier && !isDoctor,
  });
  const { data: ordersForChart } = useQuery({
    queryKey: ['orders', 'chart', pathologistOnly],
    queryFn: () => ordersApi.list({ limit: 100, ...pathologistOnly }).then((r) => r.data),
    enabled: !isCourier && !isDoctor,
  });
  const { data: orderCounts } = useQuery({
    queryKey: ['orders', 'counts'],
    queryFn: () => ordersApi.getCounts().then((r) => r.data),
    enabled: role === 'admin',
  });
  const { data: inProgress } = useQuery({
    queryKey: ['orders', role === 'pathologist' ? 'review' : 'in_progress', pathologistOnly],
    queryFn: () => ordersApi.list({ status: role === 'pathologist' ? 'review' : 'in_progress', limit: 10, ...pathologistOnly }).then((r) => r.data),
    enabled: !isCourier && !isDoctor && role !== 'admin',
  });
  const { data: completed } = useQuery({
    queryKey: ['orders', 'completed', pathologistOnly],
    queryFn: () => ordersApi.list({ status: 'completed', limit: 1, ...pathologistOnly }).then((r) => r.data),
    enabled: !isCourier && !isDoctor && role !== 'admin',
  });
  const { data: paymentSummary } = useQuery({
    queryKey: ['payments', 'summary'],
    queryFn: () => paymentsApi.getSummary(),
    enabled: showFinancial,
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
    enabled: showFinancial,
  });

  const { data: pickupRequestsData } = useQuery({
    queryKey: ['orders', 'pickupRequests'],
    queryFn: () => ordersApi.list({ pickupRequests: true, limit: 50 }).then((r) => r.data),
    enabled: isCourier,
  });
  const { data: myPickupsData } = useQuery({
    queryKey: ['orders', 'assignedToMeCourier'],
    queryFn: () => ordersApi.list({ assignedToMeCourier: true, limit: 50 }).then((r) => r.data),
    enabled: isCourier,
  });

  const isAdmin = role === 'admin';
  const byStatus = orderCounts?.byStatus ?? {};
  const pipelineStatuses = ['received', 'in_progress', 'assigned', 'accessioned', 'grossed', 'processing', 'embedded', 'sectioned', 'stained', 'review'];
  const pipelineCount = pipelineStatuses.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);
  const total = isAdmin ? (orderCounts?.total ?? 0) : (ordersData?.total ?? 0);
  const inProgressCount = isAdmin ? pipelineCount : (inProgress?.total ?? 0);
  const completedCount = isAdmin ? ((byStatus.completed ?? 0) + (byStatus.released ?? 0)) : (completed?.total ?? 0);
  const draftCount = byStatus.draft ?? 0;
  const cancelledCount = (byStatus.cancelled ?? 0) + (byStatus.archived ?? 0);
  const totalRevenue = paymentSummary?.totalPaid ?? 0;
  const paidOrdersCount = paymentSummary?.paidCount ?? 0;
  const pickupRequestsCount = pickupRequestsData?.data?.length ?? 0;
  const myPickupsCount = myPickupsData?.data?.length ?? 0;

  const theme = useTheme();

  const orderStatusChartData = useMemo(() => {
    if (!isAdmin) return [];
    return [
      { name: 'Draft', value: draftCount, color: theme.palette.grey[400] },
      { name: 'In progress', value: pipelineCount, color: theme.palette.primary.main },
      { name: 'Completed', value: completedCount, color: theme.palette.success.main },
      { name: 'Cancelled', value: cancelledCount, color: theme.palette.secondary.main },
    ].filter((d) => d.value > 0);
  }, [isAdmin, draftCount, pipelineCount, completedCount, cancelledCount, theme]);

  const ordersByDayChartData = useMemo(() => {
    const list = ordersForChart?.data ?? [];
    const now = new Date();
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = list.filter((o) => {
        const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
        return t >= d.getTime() && t < next.getTime();
      }).length;
      days.push({ date: d.toLocaleDateString(undefined, { weekday: 'short' }), count });
    }
    return days;
  }, [ordersForChart]);

  const showCharts = !isCourier && !isDoctor;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', pb: 6 }}>
      {/* Header */}
      <Typography variant="overline" sx={sectionLabelSx}>
        Dashboard
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, letterSpacing: '-0.02em', color: 'text.primary' }}>
        {portal.title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 560 }}>
        {portal.subtitle}
      </Typography>

      {/* Quick actions – minimal cards */}
      <Typography variant="overline" sx={sectionLabelSx}>
        Quick actions
      </Typography>
      <Grid container spacing={2} sx={{ mb: 5 }}>
        {portal.quickActions.map((a) => (
          <Grid item xs={12} sm={6} md={3} key={a.path}>
            <Button
              component={Link}
              to={a.path}
              fullWidth
              variant="outlined"
              sx={{
                ...cardSx,
                py: 2,
                px: 2.5,
                justifyContent: 'flex-start',
                textAlign: 'left',
                borderRadius: 2,
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.2),
                bgcolor: 'background.paper',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                },
              }}
              startIcon={<Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', opacity: 0.9 }}>{a.icon}</Box>}
            >
              {a.label}
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Overview metrics */}
      <Typography variant="overline" sx={sectionLabelSx}>
        Overview
      </Typography>
      <Grid container spacing={3}>
        {isDoctor ? (
          <Grid item xs={12} sm={6} md={4}>
            <Button component={Link} to="/doctor-portal" fullWidth sx={{ height: '100%', textAlign: 'left', p: 0 }}>
              <Card sx={{ ...cardSx, width: '100%', bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AssignmentIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Your referral statistics</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">View total referrals, revenue from your referrals, and recent orders.</Typography>
                </CardContent>
              </Card>
            </Button>
          </Grid>
        ) : isCourier ? (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ ...cardSx, bgcolor: 'primary.main', color: 'white', border: 'none', boxShadow: '0 4px 20px ' + alpha(theme.palette.primary.main, 0.35) }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, opacity: 0.95 }}>
                    <LocalShippingIcon sx={{ fontSize: 24 }} />
                    <Typography variant="body2" fontWeight={500}>Pickup requests available</Typography>
                  </Box>
                  <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>{pickupRequestsCount}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>Online orders needing a courier</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ ...cardSx, bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'secondary.main' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AssignmentIcon sx={{ color: 'secondary.main', fontSize: 22 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Your active deliveries</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="primary.main">{myPickupsCount}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Orders you are delivering</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        ) : (
          <>
            {isAdmin ? (
              <>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ ...cardSx, bgcolor: 'primary.main', color: 'white', border: 'none', boxShadow: '0 4px 20px ' + alpha(theme.palette.primary.main, 0.35) }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, opacity: 0.95 }}>
                        <AssignmentIcon sx={{ fontSize: 24 }} />
                        <Typography variant="body2" fontWeight={500}>All orders</Typography>
                      </Box>
                      <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>{total}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>Total count (breakdown in chart)</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ ...cardSx, bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'grey.400' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>Draft</Typography>
                      <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ mt: 0.5 }}>{draftCount}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ ...cardSx, bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        <HourglassEmptyIcon sx={{ color: 'warning.main', fontSize: 22 }} />
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>In progress (pipeline)</Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={700} color="primary.main">{inProgressCount}</Typography>
                      <Typography variant="caption" color="text.secondary">received → … → review</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ ...cardSx, bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'success.main' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 22 }} />
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>Completed</Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={700} color="primary.main">{completedCount}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ ...cardSx, bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'secondary.main' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>Cancelled / archived</Typography>
                      <Typography variant="h4" fontWeight={700} color="text.secondary" sx={{ mt: 0.5 }}>{cancelledCount}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            ) : (
              <>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ ...cardSx, bgcolor: 'primary.main', color: 'white', border: 'none', boxShadow: '0 4px 20px ' + alpha(theme.palette.primary.main, 0.35) }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, opacity: 0.95 }}>
                        <AssignmentIcon sx={{ fontSize: 24 }} />
                        <Typography variant="body2" fontWeight={500}>Total orders</Typography>
                      </Box>
                      <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>{total}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ ...cardSx, bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'warning.main' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <HourglassEmptyIcon sx={{ color: 'warning.main', fontSize: 22 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>In progress</Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={700} color="primary.main">{inProgressCount}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ ...cardSx, bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'success.main' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckCircleIcon sx={{ color: 'success.main', fontSize: 22 }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>Completed</Typography>
                      </Box>
                      <Typography variant="h4" fontWeight={700} color="primary.main">{completedCount}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </>
        )}
        {showFinancial && (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ ...cardSx, bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'success.main' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AttachMoneyIcon sx={{ color: 'success.main', fontSize: 22 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Revenue (paid)</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="success.dark">
                    {typeof totalRevenue === 'number' ? totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}{' '}
                    <Typography component="span" variant="body1" color="text.secondary" fontWeight={500}>{settings?.currency ?? 'USD'}</Typography>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ ...cardSx, bgcolor: 'background.paper', borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PaymentsIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>Paid transactions</Typography>
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="primary.main">{paidOrdersCount}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}
      </Grid>

      {/* Charts */}
      {showCharts && (
        <>
          <Typography variant="overline" sx={{ ...sectionLabelSx, mt: 5 }}>
            Analytics
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {isAdmin && orderStatusChartData.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: alpha('#000', 0.06) }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>Orders by status</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>Breakdown of current order states</Typography>
                    <Box sx={{ height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderStatusChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={88}
                            innerRadius={44}
                            paddingAngle={2}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {orderStatusChartData.map((_, i) => (
                              <Cell key={i} fill={orderStatusChartData[i].color} stroke={theme.palette.background.paper} strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [Number(value ?? 0), 'Orders']} contentStyle={{ borderRadius: 8, border: '1px solid', borderColor: alpha('#000', 0.08) }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {!isDoctor && (
              <Grid item xs={12} md={isAdmin && orderStatusChartData.length > 0 ? 6 : 12}>
                <Card sx={{ borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: alpha('#000', 0.06) }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>Activity</Typography>
                        <Typography variant="caption" color="text.secondary">Orders created per day</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ px: 1.5, py: 0.5, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', fontWeight: 600 }}>
                        Timeframe: Last 7 days
                      </Typography>
                    </Box>
                    <Box sx={{ height: 280 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ordersByDayChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.06)} vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid', borderColor: alpha('#000', 0.08) }} />
                          <Bar dataKey="count" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} name="Orders" maxBarSize={48} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Recent orders / deliveries */}
      <Typography variant="overline" sx={{ ...sectionLabelSx, mt: 5 }}>
        {isCourier ? 'Your deliveries' : 'Recent orders'}
      </Typography>
      <Card sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: alpha('#000', 0.06) }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
              {isCourier ? 'Active deliveries' : 'Latest orders'}
            </Typography>
          </Box>
          <Box sx={{ p: 3 }}>
          {isCourier ? (
            myPickupsData?.data?.length ? (
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {myPickupsData.data.map((o) => (
                  <Box
                    key={o._id}
                    component="li"
                    sx={{
                      py: 1.5,
                      px: 0,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 0 },
                    }}
                  >
                    <Typography variant="body1">
                      <Box component="span" fontWeight={600} sx={{ mr: 1 }}>{o.orderNumber}</Box>
                      — {typeof o.patient === 'object' && o.patient ? `${(o.patient as { firstName?: string; lastName?: string }).firstName} ${(o.patient as { firstName?: string; lastName?: string }).lastName}` : '—'} — {o.courierStatus || '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">No active deliveries. Go to Courier to claim a pickup.</Typography>
            )
          ) : (
            ordersData?.data?.length ? (
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {ordersData.data.map((o) => (
                  <Box
                    key={o._id}
                    component="li"
                    sx={{
                      py: 1.5,
                      px: 0,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 0 },
                    }}
                  >
                    <Typography variant="body1">
                      <Box component="span" fontWeight={600} sx={{ mr: 1 }}>{o.orderNumber}</Box>
                      — {typeof o.patient === 'object' && o.patient ? `${(o.patient as { firstName?: string; lastName?: string }).firstName} ${(o.patient as { firstName?: string; lastName?: string }).lastName}` : '—'} — {o.status}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">No orders yet.</Typography>
            )
          )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
