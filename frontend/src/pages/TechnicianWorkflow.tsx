import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScienceIcon from '@mui/icons-material/Science';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuthStore } from '../stores/authStore';
import { ordersApi, accessionsApi, usersApi } from '../api/endpoints';
import type { Order, User } from '../api/endpoints';

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

const PENDING_STATUSES = ['received', 'assigned', 'accessioned', 'grossed'];
const IN_PROGRESS_STATUSES = ['processing', 'embedded', 'sectioned', 'stained'];
const COMPLETED_STATUSES = ['review', 'completed', 'released'];

function getPatientName(order: Order): string {
  const p = order.patient;
  if (typeof p === 'object' && p) return `${p.firstName} ${p.lastName}`;
  return '—';
}

export default function TechnicianWorkflow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [filter, setFilter] = useState('all');
  const [accessionDialog, setAccessionDialog] = useState<{ order: Order; accessionId: string } | null>(null);
  const [pathologistDialog, setPathologistDialog] = useState<Order | null>(null);
  const [pathologistId, setPathologistId] = useState('');
  const [snackbar, setSnackbar] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'technician', isAdmin ? 'workflow' : 'assigned'],
    queryFn: () =>
      ordersApi
        .list(isAdmin ? { workflow: 'technician', limit: 100 } : { assignedToMe: true, limit: 100 })
        .then((r) => r.data),
  });

  const { data: pathologists, isLoading: pathologistsLoading, isError: pathologistsError } = useQuery({
    queryKey: ['users', 'pathologists'],
    queryFn: () => usersApi.list().then((r) => r.data),
    enabled: !!pathologistDialog,
  });

  const orders = data?.data ?? [];
  const pathologistList = (pathologists ?? []).filter((u: User) => u.role === 'pathologist');

  const filteredOrders = orders.filter((o: Order) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return PENDING_STATUSES.includes(o.status);
    if (filter === 'in_progress') return IN_PROGRESS_STATUSES.includes(o.status);
    if (filter === 'completed') return COMPLETED_STATUSES.includes(o.status);
    return true;
  });

  const startProcessingMutation = useMutation({
    mutationFn: (orderId: string) => accessionsApi.create(orderId),
    onSuccess: (acc, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['accessions'] });
      const order = orders.find((o: Order) => o._id === orderId);
      if (order) setAccessionDialog({ order, accessionId: acc.accessionId });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err.response?.data?.message;
      setSnackbar(msg ? `Accession: ${msg}` : 'Failed to create accession');
    },
  });

  const assignPathologistMutation = useMutation({
    mutationFn: ({ orderId, pathologistId }: { orderId: string; pathologistId: string }) =>
      ordersApi.update(orderId, { assignedPathologist: pathologistId, status: 'review' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setPathologistDialog(null);
      setPathologistId('');
      setSnackbar('Sample marked as ready for review and pathologist assigned.');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setSnackbar(err.response?.data?.message || 'Failed to assign pathologist');
    },
  });

  const handleStartProcessing = (order: Order) => {
    startProcessingMutation.mutate(order._id);
  };

  const handleAssignPathologist = () => {
    if (!pathologistDialog || !pathologistId) return;
    assignPathologistMutation.mutate({ orderId: pathologistDialog._id, pathologistId });
  };

  const canStartProcessing = (o: Order) =>
    o.status === 'received' || o.status === 'assigned' || o.status === 'accessioned' || o.status === 'grossed';
  const canMarkReady = (o: Order) => o.status === 'stained' || o.status === 'review';

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
        Technician workflow
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Orders assigned to you. Start processing to create an accession, then proceed to Histology for grossing → processing → embedding → sectioning → staining. When ready, assign a pathologist for review.
      </Typography>
      <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ mb: 2 }}>
        {FILTERS.map((f) => (
          <Tab key={f.value} label={f.label} value={f.value} />
        ))}
      </Tabs>
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4}>Loading…</TableCell></TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow><TableCell colSpan={4}>No orders in this view.</TableCell></TableRow>
              ) : (
                filteredOrders.map((row: Order) => (
                  <TableRow key={row._id}>
                    <TableCell><strong>{row.orderNumber}</strong></TableCell>
                    <TableCell>{getPatientName(row)}</TableCell>
                    <TableCell><Chip label={row.status} size="small" /></TableCell>
                    <TableCell align="right">
                      {canStartProcessing(row) && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleStartProcessing(row)}
                          disabled={startProcessingMutation.isPending}
                          sx={{ mr: 1 }}
                        >
                          {row.status === 'received' || row.status === 'assigned' ? 'Start processing' : 'View accession'}
                        </Button>
                      )}
                      {canMarkReady(row) && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<RateReviewIcon />}
                          onClick={() => {
                          const p = row.assignedPathologist;
                          setPathologistDialog(row);
                          setPathologistId(typeof p === 'object' && p ? (p as User)._id : p ? String(p) : '');
                        }}
                        >
                          Mark ready for review
                        </Button>
                      )}
                      {(row.status === 'accessioned' || row.status === 'grossed' || IN_PROGRESS_STATUSES.includes(row.status)) && (
                        <Button
                          size="small"
                          startIcon={<ScienceIcon />}
                          onClick={() => navigate('/histology')}
                        >
                          Histology
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

      <Dialog open={!!accessionDialog} onClose={() => setAccessionDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Accession {accessionDialog ? (accessionDialog.order.status === 'received' || accessionDialog.order.status === 'assigned' ? 'Created' : 'Found') : ''}</DialogTitle>
        <DialogContent>
          {accessionDialog && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">Order {accessionDialog.order.orderNumber}</Typography>
              <Typography variant="h6" sx={{ mt: 2 }}>{accessionDialog.accessionId}</Typography>
              <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => navigator.clipboard.writeText(accessionDialog.accessionId)}>
                Copy Accession ID
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Enter this Accession ID in Histology for grossing.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccessionDialog(null)}>Close</Button>
          <Button variant="contained" onClick={() => { navigate('/histology'); setAccessionDialog(null); }}>
            Proceed to Histology
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pathologistDialog} onClose={() => setPathologistDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark ready for review</DialogTitle>
        <DialogContent>
          {pathologistDialog && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">Order {pathologistDialog.orderNumber} — {getPatientName(pathologistDialog)}</Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Pathologist</InputLabel>
                <Select value={pathologistId} label="Pathologist" onChange={(e) => setPathologistId(e.target.value)}>
                  {pathologistsLoading && <MenuItem disabled>Loading…</MenuItem>}
                  {!pathologistsLoading && pathologistsError && <MenuItem disabled>Could not load pathologists</MenuItem>}
                  {!pathologistsLoading && !pathologistsError && pathologistList.length === 0 && <MenuItem disabled>No pathologists in system</MenuItem>}
                  {pathologistList.map((u: User) => (
                    <MenuItem key={u._id} value={u._id}>{u.name} ({u.email})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPathologistDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignPathologist} disabled={!pathologistId || assignPathologistMutation.isPending}>
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar('')} message={snackbar} />
    </Box>
  );
}
