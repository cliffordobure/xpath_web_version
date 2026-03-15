import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Chip,
} from '@mui/material';
import { Logo } from '../components/Logo';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useMutation } from '@tanstack/react-query';
import { patientPortalApi } from '../api/endpoints';
import type { Order } from '../api/endpoints';

export default function PatientPortal() {
  const navigate = useNavigate();
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);

  const listOrders = useMutation({
    mutationFn: () =>
      patientPortalApi.listOrders({
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.trim(),
      }),
    onSuccess: (data) => setOrders(data),
    onError: () => setOrders([]),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim() || !dateOfBirth.trim()) return;
    listOrders.mutate();
  };

  const openOrderDetail = (order: Order) => {
    navigate(`/patient-portal/order/${order._id}`, {
      state: { lastName: lastName.trim(), dateOfBirth: dateOfBirth.trim() },
    });
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
      <Box sx={{ maxWidth: 560, margin: '0 auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
          <Logo height={48} variant="light" />
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', mb: 3 }}>
          Use your last name and date of birth to view all your tests, order status, results, and pay (e.g. MTN Mobile Money).
        </Typography>

        <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Find your orders
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your last name and date of birth to see current and past orders. You can open any order for full details and status.
            </Typography>

            <form onSubmit={handleSubmit}>
              {listOrders.isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {(listOrders.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'No orders found. Check your details and try again.'}
                </Alert>
              )}
              <TextField
                fullWidth
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Date of birth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
              />
              <Button type="submit" fullWidth variant="contained" size="large" startIcon={<SearchIcon />} sx={{ mt: 2 }} disabled={listOrders.isPending}>
                {listOrders.isPending ? 'Looking up…' : 'Find my orders'}
              </Button>
            </form>

            {orders.length > 0 && (
              <>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 3, mb: 1 }}>
                  Your orders
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  All your tests with XPath Lab. Click an order for details, timeline, results, and payment.
                </Typography>
                <List dense disablePadding>
                  {orders.map((order) => {
                    const tests = order.testTypes ?? [];
                    const testSummary = tests.length
                      ? tests
                          .slice(0, 3)
                          .map((t) => (typeof t === 'object' && t && 'code' in t ? (t as { code: string }).code : String(t)))
                          .join(', ') + (tests.length > 3 ? ` +${tests.length - 3} more` : '')
                      : 'No tests listed';
                    return (
                      <ListItem key={order._id} disablePadding secondaryAction={<ChevronRightIcon color="action" />}>
                        <ListItemButton onClick={() => openOrderDetail(order)}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <AssignmentIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={order.orderNumber}
                            secondary={
                              <>
                                {order.createdAt && new Date(order.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                {' · '}
                                <Chip label={order.status} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                                {testSummary && (
                                  <>
                                    <br />
                                    <Typography component="span" variant="caption" color="text.secondary">
                                      {testSummary}
                                    </Typography>
                                  </>
                                )}
                              </>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
                <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={() => { setOrders([]); listOrders.reset(); }}>
                  Look up different person
                </Button>
              </>
            )}

            {listOrders.isSuccess && orders.length === 0 && !listOrders.isError && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
                No orders found for this last name and date of birth.
              </Typography>
            )}
          </CardContent>
        </Card>

        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', mt: 2 }}>
          Staff? <Link to="/login" style={{ color: 'white', fontWeight: 600 }}>Sign in to LIMS</Link>
        </Typography>
      </Box>
    </Box>
  );
}
