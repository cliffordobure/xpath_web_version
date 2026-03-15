import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { histologyApi } from '../api/endpoints';
import type { Block, Slide } from '../api/endpoints';

function IdWithQR({
  id,
  onClick,
  secondary,
}: { id: string; onClick?: () => void; secondary?: string }) {
  const content = (
    <>
      <QRCodeSVG value={id} size={56} level="M" />
      <ListItemText primary={id} secondary={secondary ?? (onClick ? 'Click to use in form' : 'Scan with QR reader')} primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
    </>
  );
  return onClick ? (
    <ListItemButton onClick={onClick} sx={{ alignItems: 'flex-start', borderRadius: 1, gap: 1 }}>
      {content}
    </ListItemButton>
  ) : (
    <ListItem sx={{ alignItems: 'flex-start', borderRadius: 1, gap: 1 }}>
      {content}
    </ListItem>
  );
}

export default function Histology() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [accessionId, setAccessionId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [slideId, setSlideId] = useState('');
  const [grossDescription, setGrossDescription] = useState('');
  const [numberOfBlocks, setNumberOfBlocks] = useState(1);
  const [processorId, setProcessorId] = useState('');
  const [programName, setProgramName] = useState('');
  const [reagentLots, setReagentLots] = useState('');
  const [numberOfSlides, setNumberOfSlides] = useState(1);
  const [thickness, setThickness] = useState('');
  const [microtomeId, setMicrotomeId] = useState('');
  const [stainType, setStainType] = useState('H&E');
  const [qcStatus, setQcStatus] = useState('pending');
  const [lookupTrigger, setLookupTrigger] = useState<string | null>(null);
  const [blocksListAccessionId, setBlocksListAccessionId] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: accessionData, isLoading: accessionLoading, isError: accessionLookupError } = useQuery({
    queryKey: ['histology-accession', lookupTrigger],
    queryFn: () => histologyApi.getAccession(lookupTrigger!),
    enabled: !!lookupTrigger && (tab === 0 || tab === 1),
    retry: false,
  });

  const { data: blocksData } = useQuery({
    queryKey: ['histology-blocks', blocksListAccessionId],
    queryFn: () => histologyApi.getBlocks(blocksListAccessionId),
    enabled: !!blocksListAccessionId && (tab === 2 || tab === 3),
  });

  const { data: accessionDataForSlides } = useQuery({
    queryKey: ['histology-accession-slides', blocksListAccessionId],
    queryFn: () => histologyApi.getAccession(blocksListAccessionId),
    enabled: !!blocksListAccessionId && (tab === 3 || tab === 4),
  });

  const blocks = blocksData ?? [];
  const accession = accessionData?.accession;
  const accessionSlides = (tab === 0 || tab === 1 ? accessionData?.slides : accessionDataForSlides?.slides) ?? [];

  const saveGrossing = useMutation({
    mutationFn: () => histologyApi.saveGrossing({ accessionId, grossDescription, numberOfBlocks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['histology-accession'] });
      setMessage({ type: 'success', text: `Grossing saved. Order status: grossed. Go to the Processing tab and use Accession ID: ${accessionId}` });
      setLookupTrigger(null);
      setGrossDescription('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setMessage({ type: 'error', text: e.response?.data?.message || 'Save failed' }),
  });

  const saveProcessing = useMutation({
    mutationFn: () =>
      histologyApi.saveProcessing({ accessionId, processorId, programName, reagentLots }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setMessage({ type: 'success', text: 'Processing recorded. Order status: processing.' });
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setMessage({ type: 'error', text: e.response?.data?.message || 'Save failed' }),
  });

  const recordEmbedding = useMutation({
    mutationFn: () => histologyApi.recordEmbedding(blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setMessage({ type: 'success', text: 'Embedding recorded. Order status: embedded.' });
      setBlockId('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed' }),
  });

  const recordSectioning = useMutation({
    mutationFn: () =>
      histologyApi.recordSectioning({
        blockId,
        numberOfSlides,
        thickness: thickness || undefined,
        microtomeId: microtomeId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['histology-accession-slides'] });
      queryClient.invalidateQueries({ queryKey: ['histology-accession'] });
      setMessage({ type: 'success', text: 'Slides created. Order status: sectioned. Slide IDs appear in the list (with QR codes). Use them in the Staining tab.' });
      setBlockId('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed' }),
  });

  const saveStaining = useMutation({
    mutationFn: () => histologyApi.saveStaining({ slideId, stainType, qcStatus }),
    onSuccess: (data: { orderStatus?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setMessage({
        type: 'success',
        text: data?.orderStatus === 'review' ? 'Staining saved. All slides QC Passed — order moved to review.' : 'Staining saved.',
      });
      setSlideId('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed' }),
  });

  const handleLookupAccession = () => setLookupTrigger(accessionId || null);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
        Histology
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Grossing → Processing → Embedding → Sectioning → Staining. Use Accession ID for grossing and processing; use Block ID for embedding and sectioning; use Slide ID for staining. QR codes are shown for each ID — scan them or click to fill the form.
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Grossing" />
        <Tab label="Processing" />
        <Tab label="Embedding" />
        <Tab label="Sectioning" />
        <Tab label="Staining" />
      </Tabs>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      {/* Grossing */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Grossing</Typography>
                <TextField
                  fullWidth
                  label="Accession ID"
                  value={accessionId}
                  onChange={(e) => setAccessionId(e.target.value)}
                  placeholder="e.g. XP-25-000001"
                  sx={{ mb: 2 }}
                />
                <Button variant="outlined" onClick={handleLookupAccession} sx={{ mb: 2 }}>
                  Search / Look up
                </Button>
                {accessionLoading && <Typography variant="body2">Loading…</Typography>}
                <TextField
                  fullWidth
                  label="Gross description (required)"
                  multiline
                  rows={3}
                  value={grossDescription}
                  onChange={(e) => setGrossDescription(e.target.value)}
                  placeholder="Tissue appearance, size, number of pieces"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Number of blocks"
                  inputProps={{ min: 1 }}
                  value={numberOfBlocks}
                  onChange={(e) => setNumberOfBlocks(parseInt(e.target.value, 10) || 1)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={() => saveGrossing.mutate()}
                  disabled={!accessionId || !grossDescription.trim() || saveGrossing.isPending}
                >
                  Save grossing
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Pending grossing</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Accessions whose order is not yet grossed. After you save grossing, the order moves to the next step and leaves this list.
                </Typography>
                {accession && (() => {
                  const order = typeof accession.order === 'object' ? accession.order as { orderNumber?: string; status?: string } : null;
                  const status = order?.status ?? '';
                  const isAlreadyGrossed = status === 'grossed';
                  return (
                    <ListItem>
                      <ListItemText
                        primary={accession.accessionId}
                        secondary={order ? `${order.orderNumber ?? ''} — ${isAlreadyGrossed ? 'Already grossed → go to Processing tab' : `Status: ${status}`}` : ''}
                      />
                    </ListItem>
                  );
                })()}
                {lookupTrigger && !accession && !accessionLoading && (
                  <Typography variant="body2">Accession not found or order not ready for grossing (order must be accessioned first).</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Processing */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Processing</Typography>
                <TextField
                  fullWidth
                  label="Accession ID"
                  value={accessionId}
                  onChange={(e) => setAccessionId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookupAccession()}
                  placeholder="e.g. XP-26-839627"
                  sx={{ mb: 2 }}
                />
                <Button variant="outlined" onClick={handleLookupAccession} disabled={!accessionId.trim()} sx={{ mb: 2 }}>
                  Search
                </Button>
                {lookupTrigger && accessionLoading && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Looking up accession…</Typography>
                )}
                {lookupTrigger && !accessionLoading && accessionLookupError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Accession not found. Check the Accession ID is correct (e.g. XP-26-839627) and that the order has been grossed. You can still try saving if the ID is correct.
                  </Alert>
                )}
                {lookupTrigger && !accessionLoading && accession && (() => {
                  const order = typeof accession.order === 'object' ? accession.order as { orderNumber?: string; status?: string } : null;
                  const status = order?.status ?? '';
                  return (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <QRCodeSVG value={accession.accessionId} size={48} level="M" />
                        <Box>
                          Accession found: <strong>{accession.accessionId}</strong>
                          {order && <> — Order {order.orderNumber} (status: {status})</>}
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>Scan this QR at Embedding/Sectioning/Staining to list blocks or slides.</Typography>
                        </Box>
                      </Box>
                    </Alert>
                  );
                })()}
                {accessionId.trim() && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600}>Next: Embedding</Typography>
                    Block IDs were created at Grossing. They look like <strong>{accessionId.trim()}-BLK-001</strong>, <strong>{accessionId.trim()}-BLK-002</strong>, etc. Go to the <strong>Embedding</strong> tab and enter your Accession ID in &quot;Accession ID (to list blocks)&quot; to see the list, or type the Block ID directly.
                  </Alert>
                )}
                <TextField fullWidth label="Processor ID" value={processorId} onChange={(e) => setProcessorId(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Program name" value={programName} onChange={(e) => setProgramName(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Reagent lots" value={reagentLots} onChange={(e) => setReagentLots(e.target.value)} sx={{ mb: 2 }} />
                <Button
                  variant="contained"
                  onClick={() => saveProcessing.mutate()}
                  disabled={!accessionId.trim() || saveProcessing.isPending}
                >
                  Save processing
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Embedding */}
      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Embedding</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Scan or enter the Block ID. Block IDs are created at <strong>Grossing</strong> and look like <strong>AccessionId-BLK-001</strong>.</Typography>
                <TextField
                  fullWidth
                  label="Block ID"
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  placeholder="e.g. XP-26-139710-BLK-001"
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={() => recordEmbedding.mutate()}
                  disabled={!blockId.trim() || recordEmbedding.isPending}
                >
                  Record embedding
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>How to get your Block ID</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enter your <strong>Accession ID</strong> below (e.g. the one you used in Grossing/Processing). The list will show all Block IDs for that accession. Then type or copy a Block ID into the field on the left.
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Accession ID (to list blocks)"
                  value={blocksListAccessionId}
                  onChange={(e) => setBlocksListAccessionId(e.target.value)}
                  placeholder="e.g. XP-26-139710"
                  sx={{ mb: 2 }}
                />
                <List dense>
                  {blocks.map((b: Block) => (
                    <IdWithQR key={b._id} id={b.blockId} onClick={() => setBlockId(b.blockId)} secondary="Scan QR or click to use in form" />
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Sectioning */}
      {tab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Sectioning</Typography>
                <TextField
                  fullWidth
                  label="Block ID"
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  placeholder="e.g. XP-25-000001-BLK-001"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Number of slides"
                  inputProps={{ min: 1 }}
                  value={numberOfSlides}
                  onChange={(e) => setNumberOfSlides(parseInt(e.target.value, 10) || 1)}
                  sx={{ mb: 2 }}
                />
                <TextField fullWidth label="Thickness (e.g. 4 µm)" value={thickness} onChange={(e) => setThickness(e.target.value)} sx={{ mb: 2 }} />
                <TextField fullWidth label="Microtome ID" value={microtomeId} onChange={(e) => setMicrotomeId(e.target.value)} sx={{ mb: 2 }} />
                <Button
                  variant="contained"
                  onClick={() => recordSectioning.mutate()}
                  disabled={!blockId.trim() || recordSectioning.isPending}
                >
                  Create slides
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Blocks list</Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Accession ID (to list blocks/slides)"
                  value={blocksListAccessionId}
                  onChange={(e) => setBlocksListAccessionId(e.target.value)}
                  placeholder="e.g. XP-25-000001"
                  sx={{ mt: 1, mb: 2 }}
                />
                <Typography variant="caption" color="text.secondary">Slides (from sectioning) — use these IDs in Staining; scan QR or copy</Typography>
                <List dense>{accessionSlides.slice(0, 20).map((s: Slide) => <IdWithQR key={s._id} id={s.slideId} />)}</List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Staining */}
      {tab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Staining</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  <strong>Scan:</strong> Focus the Slide ID field below, then scan the QR code on the slide label (or from the list). <strong>Or</strong> enter Accession ID on the right to list slides, then click a slide to fill the field.
                </Typography>
                <TextField
                  fullWidth
                  label="Slide ID"
                  value={slideId}
                  onChange={(e) => setSlideId(e.target.value)}
                  placeholder="Scan QR or click a slide from the list"
                  sx={{ mb: 2 }}
                  inputProps={{ autoComplete: 'off' }}
                />
                <TextField fullWidth label="Stain type" value={stainType} onChange={(e) => setStainType(e.target.value)} sx={{ mb: 2 }} />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>QC status</InputLabel>
                  <Select value={qcStatus} label="QC status" onChange={(e) => setQcStatus(e.target.value)}>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="passed">Passed</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  onClick={() => saveStaining.mutate()}
                  disabled={!slideId.trim() || saveStaining.isPending}
                >
                  Save staining
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Where to get Slide IDs</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enter your <strong>Accession ID</strong> below. Slide IDs are created at Sectioning and look like <strong>BlockId-SLD-001</strong>. Each has a QR code: scan it (with cursor in Slide ID field) or click to fill.
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Accession ID (to list slides)"
                  value={blocksListAccessionId}
                  onChange={(e) => setBlocksListAccessionId(e.target.value)}
                  placeholder="e.g. XP-26-139710"
                  sx={{ mb: 2 }}
                />
                <List dense>{accessionSlides.slice(0, 30).map((s: Slide) => <IdWithQR key={s._id} id={s.slideId} onClick={() => setSlideId(s.slideId)} secondary="Scan QR or click to use in form" />)}</List>
              </CardContent>
            </Card>
          </Grid>
          {message?.type === 'success' && message?.text?.includes('order moved to review') && (
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ bgcolor: 'success.50', borderColor: 'success.200' }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>What&apos;s next</Typography>
                  <Typography variant="body2" paragraph>
                    This order is in <strong>review</strong>. Assign a pathologist from the Technician Workflow so they can open the case and view slide images. Scanner images sent to the server via API will appear for the pathologist.
                  </Typography>
                  <Button component={RouterLink} to="/technician/workflow" variant="contained" size="small">
                    Go to Technician Workflow → Assign pathologist
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
