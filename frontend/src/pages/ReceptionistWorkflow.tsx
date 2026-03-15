import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { ordersApi, paymentsApi, usersApi, settingsApi } from '../api/endpoints';
import type { Order, Payment, User } from '../api/endpoints';

const RECEPTIONIST_STEP_LABELS: Record<string, string> = {
  receive: 'Receive',
  payment: 'Payment',
  courier: 'Courier',
  assign: 'Assign technician',
  results: 'Results',
};

const DEFAULT_RECEPTIONIST_STEPS = ['receive', 'payment', 'courier', 'assign', 'results'];

const PAYMENT_METHODS = ['cash', 'card', 'insurance', 'transfer', 'mtn_mobile_money', 'orange_money', 'other'] as const;
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  insurance: 'Insurance',
  transfer: 'Transfer',
  mtn_mobile_money: 'MTN Mobile Money',
  orange_money: 'Orange Money',
  other: 'Other',
};

function getPatientName(order: Order): string {
  const p = order.patient;
  if (typeof p === 'object' && p) return `${p.firstName} ${p.lastName}`;
  return '—';
}

function getOrderIdFromPayment(p: Payment): string {
  const o = p.order;
  return typeof o === 'object' && o ? o._id : String(o);
}

export default function ReceptionistWorkflow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('receive');
  const [paymentDialog, setPaymentDialog] = useState<Order | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  });

  const workflowSteps =
    (settings?.receptionistWorkflowSteps?.filter((s) => RECEPTIONIST_STEP_LABELS[s]) as string[]) ||
    DEFAULT_RECEPTIONIST_STEPS;
  const tabs = workflowSteps.map((value) => ({
    label: RECEPTIONIST_STEP_LABELS[value] || value,
    value,
  }));
  const [assignDialog, setAssignDialog] = useState<Order | null>(null);
  const [courierOrder, setCourierOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [assignTechId, setAssignTechId] = useState('');
  const [error, setError] = useState('');

  const { data: ordersData } = useQuery({
    queryKey: ['orders', 'workflow', tab],
    queryFn: () => ordersApi.list({ limit: 100 }).then((r) => r.data),
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['payments', 'completed'],
    queryFn: () => paymentsApi.list({ status: 'completed', limit: 500 }).then((r) => r.data),
    enabled: tab === 'payment' || !!paymentDialog,
  });

  const { data: users, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
    enabled: tab === 'assign' || !!assignDialog,
  });

  const orders = ordersData?.data ?? [];
  const completedPayments = paymentsData?.data ?? [];
  const paidOrderIds = new Set(completedPayments.map(getOrderIdFromPayment));
  const technicians = (users ?? []).filter((u: User) => u.role === 'technician');

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) =>
      ordersApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setPaymentDialog(null);
      setAssignDialog(null);
      setCourierOrder(null);
      setPaymentAmount('');
      setAssignTechId('');
      setError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Update failed');
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: { order: string; amount: number; method?: string }) =>
      paymentsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setPaymentDialog(null);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setError('');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Payment failed');
    },
  });

  const handleMarkReceived = (order: Order) => {
    updateOrderMutation.mutate({
      id: order._id,
      data: { status: 'received', receivedAt: new Date().toISOString() },
    });
  };

  const openPaymentDialog = (order: Order) => {
    setPaymentDialog(order);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setError('');
  };

  const handleConfirmPayment = () => {
    if (!paymentDialog) return;
    const amount = parseFloat(paymentAmount);
    if (Number.isNaN(amount) || amount < 0) {
      setError('Enter a valid amount');
      return;
    }
    createPaymentMutation.mutate({
      order: paymentDialog._id,
      amount,
      method: paymentMethod,
    });
  };

  const handleCourierStatus = (order: Order, status: string) => {
    updateOrderMutation.mutate({
      id: order._id,
      data: { courierStatus: status },
    });
  };

  const openAssignDialog = (order: Order) => {
    setAssignDialog(order);
    const tech = order.assignedTechnician;
    setAssignTechId(typeof tech === 'object' && tech ? tech._id : tech ? String(tech) : '');
    setError('');
  };

  const handleAssignTechnician = () => {
    if (!assignDialog || !assignTechId) {
      setError('Select a technician');
      return;
    }
    updateOrderMutation.mutate({
      id: assignDialog._id,
      data: { assignedTechnician: assignTechId, status: 'assigned' },
    });
  };

  // Filter orders per tab
  const draftOrders = orders.filter((o: Order) => o.status === 'draft');
  const needPaymentOrders = orders.filter(
    (o: Order) => (o.status === 'draft' || o.status === 'received') && !paidOrderIds.has(o._id)
  );
  const courierOrders = orders.filter(
    (o: Order) =>
      o.courierStatus === 'ready_for_pickup' ||
      o.courierStatus === 'in_transit' ||
      (o.referringDoctor && o.status === 'received' && !o.courierStatus)
  );
  const needAssignOrders = orders.filter(
    (o: Order) =>
      (o.status === 'received' || (o.courierStatus === 'received_at_lab' && o.status === 'received')) &&
      !o.assignedTechnician
  );
  const waitingResultsOrders = orders.filter((o: Order) =>
    ['assigned', 'in_progress', 'review'].includes(o.status)
  );
  const completedOrders = orders.filter((o: Order) => o.status === 'completed');

  const getOrdersForTab = () => {
    switch (tab) {
      case 'receive':
        return draftOrders;
      case 'payment':
        return needPaymentOrders;
      case 'courier':
        return courierOrders;
      case 'assign':
        return needAssignOrders;
      case 'results':
        return [...waitingResultsOrders, ...completedOrders];
      default:
        return [];
    }
  };

  const list = getOrdersForTab();

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
        Receptionist workflow
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Receive orders (web or walk-in) → Confirm payment → Add courier if needed → Assign to technician → Wait for results.
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {tabs.map((t) => (
          <Tab key={t.value} label={t.label} value={t.value} />
        ))}
      </Tabs>
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Tests</TableCell>
                <TableCell>Status</TableCell>
                {tab === 'courier' && <TableCell>Courier</TableCell>}
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tab === 'courier' ? 6 : 5}>
                    <Typography color="text.secondary">No orders in this step.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row: Order) => (
                  <TableRow key={row._id}>
                    <TableCell><strong>{row.orderNumber}</strong></TableCell>
                    <TableCell>{getPatientName(row)}</TableCell>
                    <TableCell>
                      {(row.testTypes ?? []).slice(0, 2).map((t) =>
                        typeof t === 'object' ? t.code : t
                      ).join(', ')}
                      {(row.testTypes?.length ?? 0) > 2 && '…'}
                    </TableCell>
                    <TableCell>
                      <Chip label={row.status} size="small" />
                      {row.courierStatus && (
                        <Chip label={row.courierStatus} size="small" variant="outlined" sx={{ ml: 0.5 }} />
                      )}
                    </TableCell>
                    {tab === 'courier' && (
                      <TableCell>
                        {row.courierStatus || '—'}
                      </TableCell>
                    )}
                    <TableCell align="right">
                      {tab === 'receive' && (
                        <Button size="small" variant="contained" startIcon={<CheckCircleIcon />} onClick={() => handleMarkReceived(row)}>
                          Mark received
                        </Button>
                      )}
                      {tab === 'payment' && (
                        <Button size="small" variant="contained" onClick={() => openPaymentDialog(row)}>
                          Confirm payment
                        </Button>
                      )}
                      {tab === 'courier' && (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {(!row.courierStatus || row.courierStatus === '') && (
                            <Button size="small" onClick={() => handleCourierStatus(row, 'ready_for_pickup')}>
                              Ready for pickup
                            </Button>
                          )}
                          {row.courierStatus === 'ready_for_pickup' && (
                            <Button size="small" onClick={() => handleCourierStatus(row, 'in_transit')}>
                              In transit
                            </Button>
                          )}
                          {(row.courierStatus === 'ready_for_pickup' || row.courierStatus === 'in_transit') && (
                            <Button size="small" variant="contained" onClick={() => handleCourierStatus(row, 'received_at_lab')}>
                              Received at lab
                            </Button>
                          )}
                        </Box>
                      )}
                      {tab === 'assign' && (
                        <Button size="small" variant="contained" startIcon={<PersonIcon />} onClick={() => openAssignDialog(row)}>
                          Assign technician
                        </Button>
                      )}
                      {tab === 'results' && (
                        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => navigate(`/orders/${row._id}`)}>
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Confirm payment dialog */}
      <Dialog open={!!paymentDialog} onClose={() => setPaymentDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm payment</DialogTitle>
        <DialogContent>
          {paymentDialog && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">Order {paymentDialog.orderNumber} — {getPatientName(paymentDialog)}</Typography>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              <TextField
                fullWidth
                label={`Amount (${settings?.currency ?? 'USD'})`}
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                sx={{ mt: 2 }}
              />
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Method</InputLabel>
                <Select value={paymentMethod} label="Method" onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <MenuItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m] || m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmPayment} disabled={createPaymentMutation.isPending}>
            Confirm payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign technician dialog */}
      <Dialog open={!!assignDialog} onClose={() => setAssignDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign technician</DialogTitle>
        <DialogContent>
          {assignDialog && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">Order {assignDialog.orderNumber} — {getPatientName(assignDialog)}</Typography>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              {usersError && (
                <Alert severity="warning" sx={{ mt: 2 }}>Could not load technicians. You may need to sign in as admin to manage users.</Alert>
              )}
              {!usersError && technicians.length === 0 && !usersLoading && (
                <Alert severity="info" sx={{ mt: 2 }}>No technicians in the system. An admin must add users with the Technician role (Admin → Users).</Alert>
              )}
              <FormControl fullWidth sx={{ mt: 2 }} disabled={usersLoading}>
                <InputLabel>Technician</InputLabel>
                <Select value={assignTechId} label="Technician" onChange={(e) => setAssignTechId(e.target.value)}>
                  <MenuItem value="">— Select —</MenuItem>
                  {technicians.map((u: User) => (
                    <MenuItem key={u._id} value={u._id}>{u.name} ({u.email})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignTechnician} disabled={updateOrderMutation.isPending}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
