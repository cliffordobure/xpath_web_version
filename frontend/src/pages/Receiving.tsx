import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddTaskIcon from '@mui/icons-material/AddTask';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { ordersApi, accessionsApi } from '../api/endpoints';
import type { Order } from '../api/endpoints';

function getPatientName(order: Order): string {
  const p = order.patient;
  if (typeof p === 'object' && p) return `${p.firstName} ${p.lastName}`;
  return '—';
}

export default function Receiving() {
  const queryClient = useQueryClient();
  const [orderSearch, setOrderSearch] = useState('');
  const [searchTrigger, setSearchTrigger] = useState<string | null>(null);

  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: ['order-search', searchTrigger],
    queryFn: async () => {
      if (!searchTrigger?.trim()) return null;
      const q = searchTrigger.trim();
      try {
        const res = await ordersApi.getByNumber(q);
        return res.data;
      } catch (e) {
        const res = await ordersApi.list({ search: q, limit: 10 });
        const match = res.data.data?.find(
          (o: Order) =>
            o.orderNumber.toUpperCase() === q.toUpperCase() || o._id === q
        );
        if (match) return ordersApi.get(match._id).then((r) => r.data);
        return null;
      }
    },
    enabled: !!searchTrigger?.trim(),
    retry: false,
  });

  const createAccessionMutation = useMutation({
    mutationFn: (orderId: string) => accessionsApi.create(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['accessions'] });
      setSearchTrigger(null);
      setOrderSearch('');
    },
  });

  const handleSearch = () => setSearchTrigger(orderSearch.trim() || null);

  const handleCreateAccession = () => {
    if (!order?._id) return;
    createAccessionMutation.mutate(order._id);
  };

  const readyForReceiving = order && ['draft', 'received', 'assigned'].includes(order.status);
  const alreadyAccessioned = order && order.status === 'accessioned';
  const notReadyStatus = order && !readyForReceiving && !alreadyAccessioned;
  const accessionResult = createAccessionMutation.data;

  const copyAccessionId = () => {
    if (accessionResult?.accessionId) {
      navigator.clipboard.writeText(accessionResult.accessionId);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Receiving
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter the Order number (e.g. ORD-000005) to create an Accession ID for histology. Works for orders that are Draft, Received, or Assigned. You can also create an accession from Technician Workflow via &quot;Start processing&quot; on an assigned order.
      </Typography>
      <Card sx={{ maxWidth: 560 }}>
        <CardContent>
          <TextField
            fullWidth
            label="Order ID / Order number"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. ORD-000001"
            sx={{ mb: 2 }}
          />
          <Button variant="contained" onClick={handleSearch} disabled={!orderSearch.trim()}>
            Look up order
          </Button>

          {searchTrigger && orderLoading && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Looking up order…</Typography>
            </Box>
          )}

          {searchTrigger && !orderLoading && !order && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Order not found. Check the Order number (e.g. ORD-000005). If the order exists, ensure it has not been archived or cancelled.
            </Alert>
          )}

          {order && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">Order details</Typography>
              <Typography variant="body1"><strong>{order.orderNumber}</strong> — {getPatientName(order)}</Typography>
              <Typography variant="body2" color="text.secondary">Status: {order.status}</Typography>

              {notReadyStatus && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Order status is &quot;{order.status}&quot;. To create an accession here, the order should be Draft, Received, or Assigned. Use Receptionist workflow to mark as received or assign a technician, or create the accession from Technician Workflow (Start processing).
                </Alert>
              )}

              {alreadyAccessioned && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This order is already accessioned. Use Technician Workflow or Histology with the existing Accession ID.
                </Alert>
              )}

              {readyForReceiving && !accessionResult && (
                <Button
                  variant="contained"
                  startIcon={<AddTaskIcon />}
                  onClick={handleCreateAccession}
                  disabled={createAccessionMutation.isPending}
                  sx={{ mt: 2 }}
                >
                  Create Accession
                </Button>
              )}

              {accessionResult && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Accession created</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {accessionResult.accessionId}
                  </Typography>
                  <Button size="small" startIcon={<ContentCopyIcon />} onClick={copyAccessionId} sx={{ mt: 1 }}>
                    Copy Accession ID
                  </Button>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Use this Accession ID in Histology for grossing.
                  </Typography>
                </Alert>
              )}

              {createAccessionMutation.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {(createAccessionMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create accession'}
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
