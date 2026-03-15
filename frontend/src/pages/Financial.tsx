import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Menu,
  ListItemIcon,
  ListItemText,
  Grid,
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { paymentsApi, ordersApi, settingsApi } from '../api/endpoints';
import type { Payment, Order } from '../api/endpoints';
import { formatPrice } from '../utils/currency';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  insurance: 'Insurance',
  transfer: 'Transfer',
  mtn_mobile_money: 'MTN Mobile Money',
  orange_money: 'Orange Money',
  other: 'Other',
};
const STATUS_OPTIONS = ['pending', 'completed', 'refunded', 'failed'] as const;

export default function Financial() {
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState('');
  const [processOpen, setProcessOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [processForm, setProcessForm] = useState({
    orderId: '',
    amount: '',
    method: 'cash' as string,
    reference: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['payments', orderId],
    queryFn: () => paymentsApi.list({ orderId: orderId || undefined, limit: 100 }).then((r) => r.data),
  });
  const payments = data?.data ?? [];

  const { data: allPaymentsData } = useQuery({
    queryKey: ['payments', 'all-charts'],
    queryFn: () => paymentsApi.list({ limit: 500 }).then((r) => r.data),
  });
  const allPayments = allPaymentsData?.data ?? [];

  const { data: summary } = useQuery({
    queryKey: ['payments', 'summary'],
    queryFn: () => paymentsApi.getSummary(),
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  });
  const currency = settings?.currency ?? 'USD';

  const chartByMethod = useMemo(() => {
    const byMethod: Record<string, number> = {};
    allPayments.forEach((p) => {
      if (p.status === 'completed') {
        const key = METHOD_LABELS[p.method] || p.method;
        byMethod[key] = (byMethod[key] || 0) + p.amount;
      }
    });
    return Object.entries(byMethod).map(([name, value]) => ({ name, value }));
  }, [allPayments]);

  const chartByDate = useMemo(() => {
    const now = new Date();
    const days: { date: string; amount: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayPayments = allPayments.filter((p) => {
        if (p.status !== 'completed' || !p.paidAt) return false;
        const t = new Date(p.paidAt).getTime();
        return t >= d.getTime() && t < next.getTime();
      });
      days.push({
        date: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        amount: dayPayments.reduce((s, p) => s + p.amount, 0),
        count: dayPayments.length,
      });
    }
    return days;
  }, [allPayments]);

  const pendingCount = useMemo(() => allPayments.filter((p) => p.status === 'pending').length, [allPayments]);

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'financial'],
    queryFn: () => ordersApi.list({ limit: 100 }).then((r) => r.data),
    enabled: processOpen,
  });
  const orders = ordersData?.data ?? [];

  const createPayment = useMutation({
    mutationFn: (payload: { order: string; amount: number; method?: string; reference?: string }) =>
      paymentsApi.create(payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setProcessOpen(false);
      setProcessForm({ orderId: '', amount: '', method: 'cash', reference: '' });
    },
  });

  const updatePayment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; patientConfirmed?: boolean } }) =>
      paymentsApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setAnchorEl(null);
      setSelectedPayment(null);
    },
  });

  const handleProcessSubmit = () => {
    const amount = parseFloat(processForm.amount);
    if (!processForm.orderId || !Number.isFinite(amount) || amount < 0) return;
    createPayment.mutate({
      order: processForm.orderId,
      amount,
      method: processForm.method,
      reference: processForm.reference || undefined,
    });
  };

  const getOrderNumber = (p: Payment) =>
    typeof p.order === 'object' && p.order && 'orderNumber' in p.order
      ? (p.order as Order).orderNumber
      : '—';
  const getOrderPatient = (p: Payment) => {
    const o = typeof p.order === 'object' ? p.order : null;
    if (!o || !('patient' in o)) return '—';
    const pat = (o as Order).patient;
    return typeof pat === 'object' && pat ? `${pat.firstName} ${pat.lastName}` : '—';
  };

  const theme = useTheme();
  const CHART_COLORS = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.info.main, theme.palette.success.main, theme.palette.warning.main, '#9c27b0', '#795548'];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.2, fontWeight: 600, display: 'block', mb: 0.5 }}>
        Finance
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
          Financial
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setProcessOpen(true)}
          sx={{ borderRadius: 2, px: 2.5, py: 1.25, textTransform: 'none', fontWeight: 600 }}
        >
          Process payment
        </Button>
      </Box>

      {/* KPI cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 2, bgcolor: 'primary.main', color: 'white', overflow: 'hidden' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, opacity: 0.95 }}>
                <AttachMoneyIcon sx={{ fontSize: 24 }} />
                <Typography variant="body2" fontWeight={500}>Total revenue (paid)</Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
                {formatPrice(summary?.totalPaid ?? 0, currency)}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>{summary?.paidCount ?? 0} completed payments</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 2, bgcolor: 'background.paper', boxShadow: 1 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUpIcon sx={{ color: 'success.main', fontSize: 22 }} />
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Paid transactions</Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} color="primary.main">{summary?.paidCount ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 2, bgcolor: 'background.paper', boxShadow: 1 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ScheduleIcon sx={{ color: 'warning.main', fontSize: 22 }} />
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Pending</Typography>
              </Box>
              <Typography variant="h4" fontWeight={700} color="primary.main">{pendingCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, bgcolor: 'background.paper', boxShadow: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Payments by method</Typography>
              {chartByMethod.length > 0 ? (
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartByMethod}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {chartByMethod.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatPrice(Number(value ?? 0), currency), 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>No payment data yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, bgcolor: 'background.paper', boxShadow: 1 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Revenue (last 7 days)</Typography>
              {chartByDate.some((d) => d.amount > 0) ? (
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartByDate} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                      <Tooltip formatter={(value) => [formatPrice(Number(value ?? 0), currency), 'Revenue']} labelFormatter={(_, payload) => payload?.[0]?.payload?.date} />
                      <Bar dataKey="amount" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>No revenue in the last 7 days</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transactions table */}
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1, fontWeight: 600, display: 'block', mb: 2 }}>
        Transactions
      </Typography>
      <Card sx={{ borderRadius: 2, bgcolor: 'background.paper', boxShadow: 1, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            size="small"
            label="Filter by order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. ORD-000013"
            sx={{ maxWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: alpha(theme.palette.action.hover, 0.5) } }}
          />
        </Box>
        <TableContainer>
          <Table size="medium">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Patient</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Confirmed with patient</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} sx={{ py: 4 }}>Loading…</TableCell></TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p._id} hover sx={{ '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.action.hover, 0.3) } }}>
                    <TableCell sx={{ color: 'text.secondary' }}>{p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}</TableCell>
                    <TableCell>{getOrderNumber(p)}</TableCell>
                    <TableCell>{getOrderPatient(p)}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{formatPrice(p.amount, currency)}</TableCell>
                    <TableCell>{METHOD_LABELS[p.method] || p.method}</TableCell>
                    <TableCell>
                      <Chip
                        label={p.status}
                        size="small"
                        sx={{
                          borderRadius: 2,
                          fontWeight: 600,
                          bgcolor: p.status === 'completed' ? alpha(theme.palette.success.main, 0.14) : p.status === 'refunded' ? alpha(theme.palette.grey[500], 0.14) : alpha(theme.palette.warning.main, 0.14),
                          color: p.status === 'completed' ? 'success.dark' : p.status === 'refunded' ? 'text.secondary' : 'warning.dark',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {p.patientConfirmedAt ? (
                        <Chip icon={<CheckCircleIcon />} label={new Date(p.patientConfirmedAt).toLocaleDateString()} size="small" color="success" sx={{ borderRadius: 2 }} />
                      ) : (
                        <Button size="small" variant="outlined" color="primary" onClick={() => updatePayment.mutate({ id: p._id, data: { patientConfirmed: true } })} disabled={updatePayment.isPending} sx={{ borderRadius: 2, textTransform: 'none' }}>
                          Confirm with patient
                        </Button>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" color="primary" onClick={() => setReceiptPayment(p)} startIcon={<ReceiptIcon />} sx={{ textTransform: 'none', mr: 0.5 }}>Receipt</Button>
                      <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedPayment(p); }}><MoreVertIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Process payment dialog */}
      <Dialog open={processOpen} onClose={() => setProcessOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Process payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            After payment: orders <strong>with a referring doctor/clinic</strong> are set ready for courier pickup; <strong>walk-in</strong> orders are marked ready in the lab.
          </Typography>
          {createPayment.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(createPayment.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to process payment'}
            </Alert>
          )}
          <TextField fullWidth select label="Order" value={processForm.orderId} onChange={(e) => setProcessForm((f) => ({ ...f, orderId: e.target.value }))} margin="normal" required>
            <MenuItem value="">Select order</MenuItem>
            {orders.map((o: Order) => (
              <MenuItem key={o._id} value={o._id}>
                {o.orderNumber} — {typeof o.patient === 'object' && o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : '—'}
              </MenuItem>
            ))}
          </TextField>
          <TextField fullWidth type="number" inputProps={{ min: 0, step: 0.01 }} label="Amount" value={processForm.amount} onChange={(e) => setProcessForm((f) => ({ ...f, amount: e.target.value }))} margin="normal" required />
          <TextField fullWidth select label="Method" value={processForm.method} onChange={(e) => setProcessForm((f) => ({ ...f, method: e.target.value }))} margin="normal">
            {Object.entries(METHOD_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth label="Reference (optional)" value={processForm.reference} onChange={(e) => setProcessForm((f) => ({ ...f, reference: e.target.value }))} margin="normal" placeholder="Transaction ID, check number, etc." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProcessOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleProcessSubmit} disabled={!processForm.orderId || !processForm.amount || createPayment.isPending}>
            Process payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update status menu */}
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => { setAnchorEl(null); setSelectedPayment(null); }}>
        <Typography variant="caption" sx={{ px: 2, py: 1 }}>Update status</Typography>
        {STATUS_OPTIONS.map((status) => (
          <MenuItem key={status} onClick={() => selectedPayment && updatePayment.mutate({ id: selectedPayment._id, data: { status } })}>
            <ListItemIcon><Chip size="small" label={status} /></ListItemIcon>
            <ListItemText primary={status} />
          </MenuItem>
        ))}
      </Menu>

      {/* Receipt / confirm with patient dialog */}
      <Dialog open={!!receiptPayment} onClose={() => setReceiptPayment(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Payment receipt — confirm with patient</DialogTitle>
        <DialogContent>
          {receiptPayment && (
            <Box sx={{ py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">Order</Typography>
              <Typography variant="body1">{getOrderNumber(receiptPayment)}</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>Patient: {getOrderPatient(receiptPayment)}</Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Payment</Typography>
              <Typography variant="body1">Amount: {receiptPayment.amount}</Typography>
              <Typography variant="body2">Method: {METHOD_LABELS[receiptPayment.method] || receiptPayment.method}</Typography>
              {receiptPayment.reference && <Typography variant="body2">Reference: {receiptPayment.reference}</Typography>}
              <Typography variant="body2">Date: {receiptPayment.paidAt ? new Date(receiptPayment.paidAt).toLocaleString() : '—'}</Typography>
              <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">Use this to confirm payment details with the patient. Mark &quot;Confirm with patient&quot; when done.</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptPayment(null)}>Close</Button>
          {receiptPayment && !receiptPayment.patientConfirmedAt && (
            <Button variant="contained" onClick={() => { updatePayment.mutate({ id: receiptPayment._id, data: { patientConfirmed: true } }); setReceiptPayment(null); }}>
              Mark confirmed with patient
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
