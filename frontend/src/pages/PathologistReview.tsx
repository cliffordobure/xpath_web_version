import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
import { ordersApi } from '../api/endpoints';
import type { Order } from '../api/endpoints';

export default function PathologistReview() {
  const { data } = useQuery({
    queryKey: ['orders', 'review', 'assignedToMePathologist'],
    queryFn: () => ordersApi.list({ status: 'review', assignedToMePathologist: true, limit: 50 }).then((r) => r.data),
  });
  const orders = data?.data ?? [];

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Pathologist review
      </Typography>
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((row: Order) => (
                <TableRow key={row._id}>
                  <TableCell><strong>{row.orderNumber}</strong></TableCell>
                  <TableCell>
                    {typeof row.patient === 'object' && row.patient
                      ? `${row.patient.firstName} ${row.patient.lastName}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Button component={RouterLink} to={`/pathologist-review/${row._id}`} size="small">
                      Open case & add remarks
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
