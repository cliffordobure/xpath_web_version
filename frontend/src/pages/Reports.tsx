import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Card, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EmailIcon from '@mui/icons-material/Email';
import { reportsApi } from '../api/endpoints';
import type { Order } from '../api/endpoints';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [emailOrder, setEmailOrder] = useState<Order | null>(null);
  const [emailValue, setEmailValue] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['reports', from, to],
    queryFn: () => reportsApi.list({ from: from || undefined, to: to || undefined }).then((r) => r.data),
  });
  const rows = data ?? [];

  const handleDownloadPdf = async (order: Order) => {
    if (downloadingId) return;
    setDownloadingId(order._id);
    try {
      const res = await reportsApi.downloadPdf(order._id);
      const blob = res.data as Blob;
      const name = `report-${(order.orderNumber || order._id).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      downloadBlob(blob, name);
    } catch (e) {
      console.error('PDF download failed:', e);
    } finally {
      setDownloadingId(null);
    }
  };

  const patientEmail = emailOrder && typeof emailOrder.patient === 'object' && emailOrder.patient ? emailOrder.patient.email : undefined;
  const openEmailDialog = (order: Order) => {
    setEmailOrder(order);
    setEmailValue(patientEmail || '');
    setEmailError(null);
  };
  const closeEmailDialog = () => {
    setEmailOrder(null);
    setEmailValue('');
    setEmailError(null);
  };
  const handleSendEmail = async () => {
    if (!emailOrder) return;
    const toSend = emailValue.trim();
    if (!toSend) {
      setEmailError('Enter an email address.');
      return;
    }
    setEmailSending(true);
    setEmailError(null);
    try {
      await reportsApi.emailReport(emailOrder._id, { email: toSend });
      closeEmailDialog();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && typeof (e as { response: { data?: { message?: string } } }).response?.data?.message === 'string'
        ? (e as { response: { data: { message: string } } }).response.data.message
        : 'Failed to send email.';
      setEmailError(msg);
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Reports
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Download a PDF report to give to the patient or send to them.
      </Typography>
      <Card sx={{ mb: 2 }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField type="date" size="small" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="date" size="small" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Report PDF</TableCell>
                <TableCell align="right">Email to client</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow>
              ) : (
                rows.map((row: Order) => (
                  <TableRow key={row._id}>
                    <TableCell>{row.orderNumber}</TableCell>
                    <TableCell>{typeof row.patient === 'object' && row.patient ? `${row.patient.firstName} ${row.patient.lastName}` : '—'}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => handleDownloadPdf(row)}
                        disabled={downloadingId === row._id}
                      >
                        {downloadingId === row._id ? 'Downloading…' : 'Download PDF'}
                      </Button>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EmailIcon />}
                        onClick={() => openEmailDialog(row)}
                      >
                        Email to client
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      <Dialog open={!!emailOrder} onClose={closeEmailDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Email report to client</DialogTitle>
        <DialogContent>
          {emailOrder && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Order {emailOrder.orderNumber} – {typeof emailOrder.patient === 'object' && emailOrder.patient ? `${emailOrder.patient.firstName} ${emailOrder.patient.lastName}` : 'Patient'}
            </Typography>
          )}
          <TextField
            autoFocus
            fullWidth
            label="Client email"
            type="email"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            error={!!emailError}
            helperText={emailError || (!patientEmail && 'Patient has no email on file – enter one below.')}
            placeholder="patient@example.com"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEmailDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSendEmail} disabled={emailSending}>
            {emailSending ? 'Sending…' : 'Send report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
