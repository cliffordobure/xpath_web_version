import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { workflowsApi } from '../../api/endpoints';
import type { Order } from '../../api/endpoints';

export default function WorkflowHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['workflow-history'],
    queryFn: () => workflowsApi.history({ limit: 50 }).then((r) => r.data),
  });
  const orders = data?.data ?? [];

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Workflow history
      </Typography>
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Completed at</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3}>Loading…</TableCell></TableRow>
              ) : (
                orders.map((row: Order) => (
                  <TableRow key={row._id}>
                    <TableCell>{row.orderNumber}</TableCell>
                    <TableCell>{typeof row.patient === 'object' && row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : '—'}</TableCell>
                    <TableCell>{row.completedAt ? new Date(row.completedAt).toLocaleString() : '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
