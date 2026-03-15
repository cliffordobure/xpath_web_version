import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Box, Typography, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import { samplesApi, accessionsApi } from '../../api/endpoints';
import type { Sample } from '../../api/endpoints';

export default function Inventory() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['samples'],
    queryFn: () => samplesApi.list({ limit: 100 }).then((r) => r.data),
  });
  const samples = data?.data ?? [];
  const backfill = useMutation({
    mutationFn: () => accessionsApi.backfillSamples(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      if (result.created > 0) {
        // Could show a snackbar here
      }
    },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Inventory
        </Typography>
        <Button
          variant="outlined"
          startIcon={<SyncIcon />}
          onClick={() => backfill.mutate()}
          disabled={backfill.isPending}
        >
          {backfill.isPending ? 'Syncing…' : 'Sync from accessions'}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Specimens received in the lab (accessioned) appear here. If the table is empty but you have received orders, click &quot;Sync from accessions&quot; once to populate it.
      </Typography>
      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Label</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Order</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>
              ) : (
                samples.map((s: Sample) => (
                  <TableRow key={s._id}>
                    <TableCell><strong>{s.label}</strong></TableCell>
                    <TableCell>{s.type || '—'}</TableCell>
                    <TableCell>{s.status}</TableCell>
                    <TableCell>{typeof s.order === 'object' && s.order && 'orderNumber' in s.order ? (s.order as { orderNumber: string }).orderNumber : '—'}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} to={`/inventory/sample/${s._id}`} size="small">View</Button>
                    </TableCell>
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
