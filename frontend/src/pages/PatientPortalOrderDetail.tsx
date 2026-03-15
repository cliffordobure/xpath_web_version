import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Logo } from '../components/Logo';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScienceIcon from '@mui/icons-material/Science';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DescriptionIcon from '@mui/icons-material/Description';
import PaymentIcon from '@mui/icons-material/Payment';
import { patientPortalApi, publicApi } from '../api/endpoints';
import { formatPrice } from '../utils/currency';
import type { PatientPortalOrder, Payment } from '../api/endpoints';

const COURIER_LABELS: Record<string, string> = {
  ready_for_pickup: 'Scheduled for pickup',
  on_way_to_pickup: 'Courier on the way to pick up',
  at_site_for_pickup: 'Courier at your location',
  picked_up_on_way_to_lab: 'Sample picked up, on the way to lab',
  in_transit: 'In transit to lab',
  received_at_lab: 'Received at lab',
};

function formatDate(d: string | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function formatDateTime(d: string | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function PatientPortalOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { lastName?: string; dateOfBirth?: string } | null;

  const [lastName, setLastName] = useState(state?.lastName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(state?.dateOfBirth ?? '');
  const [order, setOrder] = useState<PatientPortalOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('mtn_mobile_money');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const hasState = !!(state?.lastName && state?.dateOfBirth && orderId);
  const [loading, setLoading] = useState(hasState);
  const [verified, setVerified] = useState(!!state?.lastName && !!state?.dateOfBirth);

  const { data: config } = useQuery({
    queryKey: ['public', 'config'],
    queryFn: () => publicApi.getConfig(),
  });
  const currency = config?.currency ?? 'USD';

  const fetchOrder = async () => {
    if (!orderId || !lastName.trim() || !dateOfBirth.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const data = await patientPortalApi.getOrder(orderId, {
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.trim(),
      });
      setOrder(data);
      setVerified(true);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e && typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (e as { response: { data: { message: string } } }).response.data.message
          : 'Could not load order. Check your details.';
      setError(msg);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId && state?.lastName && state?.dateOfBirth) {
      setLastName(state.lastName);
      setDateOfBirth(state.dateOfBirth);
      setVerified(true);
      (async () => {
        setError(null);
        setLoading(true);
        try {
          const data = await patientPortalApi.getOrder(orderId, { lastName: state.lastName!, dateOfBirth: state.dateOfBirth! });
          setOrder(data);
        } catch (e: unknown) {
          const msg =
            e && typeof e === 'object' && 'response' in e && typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
              ? (e as { response: { data: { message: string } } }).response.data.message
              : 'Could not load order.';
          setError(msg);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [orderId, state?.lastName, state?.dateOfBirth]);

  const patient = order?.patient && typeof order.patient === 'object' ? order.patient : null;
  const testTypes = order?.testTypes ?? [];
  const payments = order?.payments ?? [];
  const orderTotal = testTypes.reduce(
    (sum, t) => sum + (typeof t === 'object' && t && 'price' in t && typeof (t as { price?: number }).price === 'number' ? (t as { price: number }).price : 0),
    0
  );
  const totalPaid = payments.filter((p: Payment) => p.status === 'completed').reduce((s: number, p: Payment) => s + (p.amount || 0), 0);
  const balanceDue = Math.max(0, orderTotal - totalPaid);
  const isCompleted = order?.status === 'completed';
  const courierStatus = order?.courierStatus && order.courierStatus in COURIER_LABELS ? COURIER_LABELS[order.courierStatus] : null;

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    mtn_mobile_money: 'MTN Mobile Money',
    orange_money: 'Orange Money',
    cash: 'Cash',
    card: 'Card',
    transfer: 'Bank transfer',
    other: 'Other',
  };

  const handlePaymentRequest = async () => {
    if (!orderId || !order || !lastName.trim() || !dateOfBirth.trim()) return;
    const amount = parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setPaymentSubmitting(true);
    setPaymentSuccess(false);
    try {
      await patientPortalApi.submitPaymentRequest(orderId, { lastName: lastName.trim(), dateOfBirth: dateOfBirth.trim() }, {
        amount,
        method: paymentMethod,
        reference: paymentReference.trim() || undefined,
      });
      setPaymentSuccess(true);
      setPaymentAmount('');
      setPaymentReference('');
      const updated = await patientPortalApi.getOrder(orderId, { lastName: lastName.trim(), dateOfBirth: dateOfBirth.trim() });
      setOrder(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'primary.main',
        background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #0d47a1 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 640, margin: '0 auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
          <Logo height={48} variant="light" />
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', mb: 3 }}>
          Order details and tracking
        </Typography>

        <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            {!verified ? (
              <>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/patient-portal')} sx={{ mb: 2 }}>
                  Back to portal
                </Button>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  Verify your identity to view this order
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enter your last name and date of birth to securely view order details.
                </Typography>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField fullWidth label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} margin="normal" required />
                <TextField fullWidth label="Date of birth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} margin="normal" InputLabelProps={{ shrink: true }} required />
                <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={fetchOrder} disabled={loading}>
                  {loading ? 'Loading…' : 'View order'}
                </Button>
              </>
            ) : loading && !order ? (
              <Typography color="text.secondary">Loading order…</Typography>
            ) : error && !order ? (
              <>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/patient-portal')} sx={{ mb: 2 }}>
                  Back to my orders
                </Button>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Button fullWidth variant="outlined" onClick={() => navigate('/patient-portal')}>Back to my orders</Button>
              </>
            ) : order ? (
              <>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/patient-portal')} sx={{ mb: 2 }}>
                  Back to my orders
                </Button>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AssignmentIcon color="primary" fontSize="small" />
                  <Typography variant="h6">{order.orderNumber}</Typography>
                  <Chip label={order.status} size="small" color={isCompleted ? 'success' : 'default'} />
                </Box>

                {patient && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Patient
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize="small" color="action" />
                      <Typography>
                        {patient.firstName} {patient.lastName}
                      </Typography>
                    </Box>
                    {patient.dateOfBirth && (
                      <Typography variant="body2" color="text.secondary">
                        Date of birth: {formatDate(patient.dateOfBirth)}
                      </Typography>
                    )}
                  </Paper>
                )}

                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Order source
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {order.orderSource === 'online'
                    ? 'Order placed online — courier will pick up your sample'
                    : (order.referringDoctorId && typeof order.referringDoctorId === 'object' && 'name' in order.referringDoctorId)
                      ? `Referred by: ${(order.referringDoctorId as { name: string }).name}`
                      : order.referringDoctor
                        ? `Referred by: ${order.referringDoctor}`
                        : order.orderSource === 'referral'
                          ? 'Referral / clinic order'
                          : 'Walk-in patient'}
                </Typography>

                {testTypes.length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Tests requested
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {testTypes.map((t) => (
                        <Chip
                          key={typeof t === 'object' ? t._id : t}
                          icon={<ScienceIcon sx={{ fontSize: 16 }} />}
                          label={typeof t === 'object' ? `${t.code} — ${t.name}` : t}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Timeline
                </Typography>
                <List dense disablePadding>
                  <ListItem disablePadding sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ScheduleIcon fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText primary="Order created" secondary={formatDateTime(order.createdAt)} />
                  </ListItem>
                  {order.receivedAt && (
                    <ListItem disablePadding sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText primary="Received at lab" secondary={formatDateTime(order.receivedAt)} />
                    </ListItem>
                  )}
                  {order.courierReceivedAt && (
                    <ListItem disablePadding sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <LocalShippingIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText primary="Sample received at lab (courier)" secondary={formatDateTime(order.courierReceivedAt)} />
                    </ListItem>
                  )}
                  {order.completedAt && (
                    <ListItem disablePadding sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon fontSize="small" color="success" />
                      </ListItemIcon>
                      <ListItemText primary="Report completed" secondary={formatDateTime(order.completedAt)} />
                    </ListItem>
                  )}
                </List>

                {courierStatus && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }} gutterBottom>
                      Courier status
                    </Typography>
                    <Chip icon={<LocalShippingIcon />} label={courierStatus} size="small" variant="outlined" sx={{ mb: 2 }} />
                  </>
                )}

                {isCompleted && (
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'success.50', borderColor: 'success.main', mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <DescriptionIcon color="success" />
                      <Typography fontWeight={600}>Results ready</Typography>
                    </Box>
                    {order.reportSummary ? (
                      <Typography variant="body2" gutterBottom>
                        {order.reportSummary}
                      </Typography>
                    ) : null}
                    {order.pathologistDiagnosis && (
                      <Typography variant="body2" color="text.secondary">
                        {order.pathologistDiagnosis}
                      </Typography>
                    )}
                    {!order.reportSummary && !order.pathologistDiagnosis && (
                      <Typography variant="body2" color="text.secondary">
                        Your results have been completed. Contact the lab for a printed report or further details.
                      </Typography>
                    )}
                  </Paper>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PaymentIcon fontSize="small" /> Payment
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="body2" gutterBottom>Order total: <strong>{formatPrice(orderTotal, currency)}</strong></Typography>
                  {totalPaid > 0 && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>Paid: {formatPrice(totalPaid, currency)}</Typography>
                  )}
                  {payments.length > 0 && (
                    <List dense disablePadding sx={{ mb: 1 }}>
                      {payments.map((p: Payment) => (
                        <ListItem key={p._id} disablePadding sx={{ py: 0.25 }}>
                          <ListItemText
                            primary={`${formatPrice(p.amount, currency)} — ${PAYMENT_METHOD_LABELS[p.method] || p.method} (${p.status})`}
                            secondary={p.reference ? `Ref: ${p.reference}` : undefined}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                  {balanceDue > 0 ? (
                    <>
                      <Typography variant="body2" fontWeight={600} color="primary" gutterBottom>Balance due: {formatPrice(balanceDue, currency)}</Typography>
                      {paymentSuccess && (
                        <Alert severity="success" sx={{ mb: 2 }}>Payment request recorded. We will confirm when received.</Alert>
                      )}
                      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                        <InputLabel>Payment method</InputLabel>
                        <Select value={paymentMethod} label="Payment method" onChange={(e) => setPaymentMethod(e.target.value)}>
                          <MenuItem value="mtn_mobile_money">MTN Mobile Money</MenuItem>
                          <MenuItem value="orange_money">Orange Money</MenuItem>
                          <MenuItem value="cash">Cash</MenuItem>
                          <MenuItem value="card">Card</MenuItem>
                          <MenuItem value="transfer">Bank transfer</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={String(balanceDue)}
                        inputProps={{ min: 0, step: 0.01 }}
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Phone number or reference"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder={paymentMethod === 'mtn_mobile_money' ? 'e.g. 67X XXX XX XX' : 'Payment reference'}
                        sx={{ mb: 1 }}
                      />
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handlePaymentRequest}
                        disabled={paymentSubmitting || !paymentAmount.trim() || parseFloat(paymentAmount) <= 0}
                      >
                        {paymentSubmitting ? 'Submitting…' : 'Submit payment request'}
                      </Button>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Your payment will be marked pending. The lab will confirm when received.
                      </Typography>
                    </>
                  ) : orderTotal > 0 ? (
                    <Typography variant="body2" color="success.main" fontWeight={600}>Paid in full</Typography>
                  ) : null}
                </Paper>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
                  Return to the portal anytime to track this and other orders.
                </Typography>
                <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/patient-portal')}>
                  Back to my orders
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
