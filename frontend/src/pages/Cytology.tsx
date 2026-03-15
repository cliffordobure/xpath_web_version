import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Grid,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { cytologyApi, ordersApi } from '../api/endpoints';
import type { CytologyCase as CytologyCaseType, Order } from '../api/endpoints';

function getPatientName(order: Order | string): string {
  if (!order || typeof order !== 'object') return '—';
  const patient = (order as { patient?: { firstName?: string; lastName?: string } }).patient;
  if (!patient || typeof patient !== 'object') return '—';
  const first = (patient as { firstName?: string }).firstName ?? '';
  const last = (patient as { lastName?: string }).lastName ?? '';
  return [first, last].filter(Boolean).join(' ') || '—';
}

export default function Cytology() {
  const queryClient = useQueryClient();
  const [orderNumber, setOrderNumber] = useState('');
  const [orderLookup, setOrderLookup] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [specimenType, setSpecimenType] = useState('');
  const [processingMethod, setProcessingMethod] = useState('');
  const [stainType, setStainType] = useState('');
  const [screeningStatus, setScreeningStatus] = useState<string>('pending');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['cytology-cases'],
    queryFn: () => cytologyApi.listCases({ limit: 100 }),
  });

  const { data: orderByNumber, isError: orderLookupError, isLoading: orderLookupLoading } = useQuery({
    queryKey: ['order-by-number', orderLookup],
    queryFn: () => ordersApi.getByNumber(orderLookup!).then((r) => r.data),
    enabled: !!orderLookup,
    retry: false,
  });

  const { data: selectedCase, isLoading: caseLoading } = useQuery({
    queryKey: ['cytology-case', selectedCaseId],
    queryFn: () => cytologyApi.getCase(selectedCaseId!),
    enabled: !!selectedCaseId,
  });

  const createCase = useMutation({
    mutationFn: (orderId: string) => cytologyApi.createCase(orderId),
    onSuccess: (data: CytologyCaseType) => {
      queryClient.invalidateQueries({ queryKey: ['cytology-cases'] });
      setOrderLookup(null);
      setOrderNumber('');
      setMessage({ type: 'success', text: `Cytology case created: ${data.caseId}` });
      setSelectedCaseId(data._id);
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to create case' }),
  });

  const updateCase = useMutation({
    mutationFn: (data: Parameters<typeof cytologyApi.updateCase>[1]) =>
      cytologyApi.updateCase(selectedCaseId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cytology-case', selectedCaseId] });
      queryClient.invalidateQueries({ queryKey: ['cytology-cases'] });
      setMessage({ type: 'success', text: 'Case updated.' });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to update' }),
  });

  const handleCreateFromOrder = () => {
    if (orderByNumber?._id) {
      createCase.mutate(orderByNumber._id);
    } else {
      setOrderLookup(orderNumber.trim() || null);
    }
  };

  const handleReceive = () => {
    updateCase.mutate({ specimenType: specimenType || undefined, notes: notes || undefined, received: true });
  };
  const handleProcess = () => {
    updateCase.mutate({ processingMethod: processingMethod || undefined });
  };
  const handleStain = () => {
    updateCase.mutate({ stainType: stainType || undefined });
  };
  const handleScreen = () => {
    updateCase.mutate({ screeningStatus });
  };

  useEffect(() => {
    if (selectedCase) {
      setSpecimenType(selectedCase.specimenType ?? '');
      setProcessingMethod(selectedCase.processingMethod ?? '');
      setStainType(selectedCase.stainType ?? '');
      setScreeningStatus(selectedCase.screeningStatus ?? 'pending');
      setNotes(selectedCase.notes ?? '');
    }
  }, [selectedCase]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
        Cytology
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Create a cytology case from an order, then record receive → process → stain → screen. Cases appear in the list; select one to update workflow steps.
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Create case from order
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Order number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. ORD-000001"
                sx={{ mb: 2 }}
              />
              {orderLookup && orderByNumber && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Order {orderByNumber.orderNumber} — {getPatientName(orderByNumber)}. Click Create to add a cytology case.
                </Alert>
              )}
              {orderLookup && !orderLookupLoading && orderLookupError && (
                <Alert severity="error" sx={{ mb: 2 }}>Order not found.</Alert>
              )}
              <Button
                variant="contained"
                onClick={handleCreateFromOrder}
                disabled={!orderNumber.trim() || createCase.isPending}
              >
                {orderByNumber?._id ? 'Create cytology case' : 'Look up order'}
              </Button>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Cases ({cases.length})
              </Typography>
              {casesLoading ? (
                <Typography variant="body2" color="text.secondary">Loading…</Typography>
              ) : (
                <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
                  {cases.map((c: CytologyCaseType) => {
                    const order = typeof c.order === 'object' ? c.order : null;
                    const orderNum = order && 'orderNumber' in order ? String((order as Order).orderNumber) : c.caseId;
                    return (
                      <ListItem key={c._id} disablePadding>
                        <ListItemButton
                          selected={selectedCaseId === c._id}
                          onClick={() => setSelectedCaseId(c._id)}
                        >
                          <ListItemText
                            primary={c.caseId}
                            secondary={`${orderNum} — ${getPatientName(c.order)}`}
                            primaryTypographyProps={{ fontFamily: 'monospace' }}
                          />
                          <Chip label={c.screeningStatus} size="small" sx={{ ml: 1 }} />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              )}
              {!casesLoading && cases.length === 0 && (
                <Typography variant="body2" color="text.secondary">No cytology cases yet. Create one from an order above.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {!selectedCaseId ? (
            <Card>
              <CardContent>
                <Typography color="text.secondary">Select a case from the list to view and update the workflow.</Typography>
              </CardContent>
            </Card>
          ) : caseLoading ? (
            <Typography>Loading case…</Typography>
          ) : selectedCase ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {selectedCase.caseId}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {typeof selectedCase.order === 'object' && selectedCase.order && 'orderNumber' in selectedCase.order
                    ? `Order ${String((selectedCase.order as Order).orderNumber)} — ${getPatientName(selectedCase.order)}`
                    : ''}
                </Typography>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                  <Tab label="Receive" />
                  <Tab label="Process" />
                  <Tab label="Stain" />
                  <Tab label="Screen" />
                </Tabs>

                {tab === 0 && (
                  <Box>
                    <TextField
                      fullWidth
                      label="Specimen type"
                      value={specimenType}
                      onChange={(e) => setSpecimenType(e.target.value)}
                      placeholder="e.g. LBC, Conventional smear"
                      sx={{ mb: 2 }}
                    />
                    <TextField fullWidth label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} sx={{ mb: 2 }} />
                    <Button variant="contained" onClick={handleReceive} disabled={updateCase.isPending}>
                      Mark received
                    </Button>
                    {selectedCase.receivedAt && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Received at {new Date(selectedCase.receivedAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                )}

                {tab === 1 && (
                  <Box>
                    <TextField
                      fullWidth
                      label="Processing method"
                      value={processingMethod}
                      onChange={(e) => setProcessingMethod(e.target.value)}
                      placeholder="e.g. ThinPrep, SurePath, Conventional"
                      sx={{ mb: 2 }}
                    />
                    <Button variant="contained" onClick={handleProcess} disabled={updateCase.isPending}>
                      Save processing
                    </Button>
                    {selectedCase.processingAt && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Processed at {new Date(selectedCase.processingAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                )}

                {tab === 2 && (
                  <Box>
                    <TextField
                      fullWidth
                      label="Stain type"
                      value={stainType}
                      onChange={(e) => setStainType(e.target.value)}
                      placeholder="e.g. Pap, H&E"
                      sx={{ mb: 2 }}
                    />
                    <Button variant="contained" onClick={handleStain} disabled={updateCase.isPending}>
                      Save staining
                    </Button>
                    {selectedCase.stainedAt && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Stained at {new Date(selectedCase.stainedAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                )}

                {tab === 3 && (
                  <Box>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Screening status</InputLabel>
                      <Select value={screeningStatus} label="Screening status" onChange={(e) => setScreeningStatus(e.target.value)}>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="screened">Screened</MenuItem>
                        <MenuItem value="in_review">In review</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                      </Select>
                    </FormControl>
                    <Button variant="contained" onClick={handleScreen} disabled={updateCase.isPending}>
                      Update screening status
                    </Button>
                    {selectedCase.screenedAt && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Last updated at {new Date(selectedCase.screenedAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : null}
        </Grid>
      </Grid>
    </Box>
  );
}
