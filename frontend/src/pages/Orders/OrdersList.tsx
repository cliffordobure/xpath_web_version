import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { ordersApi } from '../../api/endpoints';
import type { Order } from '../../api/endpoints';

const statusColor: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  draft: 'default',
  received: 'info',
  in_progress: 'warning',
  assigned: 'info',
  review: 'primary',
  completed: 'success',
  cancelled: 'error',
  archived: 'default',
};

export default function OrdersList() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, rowsPerPage, search, statusFilter],
    queryFn: () =>
      ordersApi
        .list({
          page: page + 1,
          limit: rowsPerPage,
          search: search || undefined,
          status: statusFilter || undefined,
        })
        .then((r) => r.data),
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Orders
        </Typography>
        <Button component={Link} to="/orders/create" variant="contained" startIcon={<AddIcon />}>
          Create order
        </Button>
      </Box>
      <Card sx={{ mb: 2 }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search by order number or patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ minWidth: 260 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="received">Received</MenuItem>
              <MenuItem value="in_progress">In progress</MenuItem>
              <MenuItem value="assigned">Assigned</MenuItem>
              <MenuItem value="review">Review</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow>
              ) : (
                rows.map((row: Order) => (
                  <TableRow key={row._id}>
                    <TableCell><strong>{row.orderNumber}</strong></TableCell>
                    <TableCell>
                      {typeof row.patient === 'object' && row.patient
                        ? `${row.patient.firstName} ${row.patient.lastName}`
                        : '—'}
                    </TableCell>
                    <TableCell><Chip label={row.status} color={statusColor[row.status] || 'default'} size="small" /></TableCell>
                    <TableCell>{row.priority}</TableCell>
                    <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} to={`/orders/${row._id}`} size="small">View</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Card>
    </Box>
  );
}
