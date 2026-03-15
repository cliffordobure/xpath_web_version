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
  Grid,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { ihcApi } from '../api/endpoints';
import type { Slide, IHCStainRecord } from '../api/endpoints';

function SlideItem({ slide, selected, onSelect }: { slide: Slide; selected: boolean; onSelect: () => void }) {
  return (
    <ListItem
      button
      selected={selected}
      onClick={onSelect}
      sx={{ borderRadius: 1, mb: 0.5 }}
    >
      <QRCodeSVG value={slide.slideId} size={40} level="M" />
      <ListItemText primary={slide.slideId} secondary={`Slide #${slide.slideNumber}`} primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.85rem' }} sx={{ ml: 1 }} />
    </ListItem>
  );
}

export default function IHC() {
  const queryClient = useQueryClient();
  const [accessionId, setAccessionId] = useState('');
  const [lookupTrigger, setLookupTrigger] = useState<string | null>(null);
  const [selectedSlideId, setSelectedSlideId] = useState('');
  const [antibody, setAntibody] = useState('');
  const [clone, setClone] = useState('');
  const [dilution, setDilution] = useState('');
  const [antigenRetrieval, setAntigenRetrieval] = useState('');
  const [detectionMethod, setDetectionMethod] = useState('');
  const [counterstain, setCounterstain] = useState('');
  const [qcStatus, setQcStatus] = useState<string>('pending');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: accessionData, isLoading: accessionLoading, isError: accessionError } = useQuery({
    queryKey: ['ihc-accession', lookupTrigger],
    queryFn: () => ihcApi.getAccession(lookupTrigger!),
    enabled: !!lookupTrigger,
    retry: false,
  });

  const { data: stains = [], refetch: refetchStains } = useQuery({
    queryKey: ['ihc-stains', selectedSlideId],
    queryFn: () => ihcApi.getStainsForSlide(selectedSlideId),
    enabled: !!selectedSlideId,
  });

  const addStain = useMutation({
    mutationFn: () =>
      ihcApi.recordStain({
        slideId: selectedSlideId,
        antibody,
        clone: clone || undefined,
        dilution: dilution || undefined,
        antigenRetrieval: antigenRetrieval || undefined,
        detectionMethod: detectionMethod || undefined,
        counterstain: counterstain || undefined,
        qcStatus,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ihc-stains', selectedSlideId] });
      refetchStains();
      setMessage({ type: 'success', text: 'IHC stain recorded.' });
      setAntibody('');
      setClone('');
      setDilution('');
      setAntigenRetrieval('');
      setDetectionMethod('');
      setCounterstain('');
      setNotes('');
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to record stain' }),
  });

  const accession = accessionData?.accession;
  const slides = accessionData?.slides ?? [];
  const blocks = accessionData?.blocks ?? [];

  const handleLookup = () => setLookupTrigger(accessionId.trim() || null);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
        IHC (Immunohistochemistry)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Look up an accession to see blocks and slides from Histology. Select a slide and record IHC stains (antibody, clone, antigen retrieval, detection, counterstain, QC). Slides must exist from the Histology sectioning step.
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Look up accession
              </Typography>
              <TextField
                fullWidth
                label="Accession ID"
                value={accessionId}
                onChange={(e) => setAccessionId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="e.g. XP-26-139710"
                sx={{ mb: 2 }}
              />
              <Button variant="outlined" onClick={handleLookup} disabled={!accessionId.trim()}>
                Search
              </Button>
              {lookupTrigger && accessionLoading && <Typography variant="body2" sx={{ mt: 2 }}>Loading…</Typography>}
              {lookupTrigger && !accessionLoading && accessionError && (
                <Alert severity="error" sx={{ mt: 2 }}>Accession not found.</Alert>
              )}
              {accession && (
                <>
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <strong>{accession.accessionId}</strong>
                    {typeof accession.order === 'object' && accession.order && 'orderNumber' in accession.order && (
                      <> — Order {String((accession.order as { orderNumber?: string }).orderNumber)}</>
                    )}
                  </Alert>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                    Slides ({slides.length})
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Select a slide to record IHC stains or view existing stains.
                  </Typography>
                  <List dense sx={{ maxHeight: 320, overflow: 'auto' }}>
                    {slides.map((s: Slide) => (
                      <SlideItem
                        key={s._id}
                        slide={s}
                        selected={selectedSlideId === s.slideId}
                        onSelect={() => setSelectedSlideId(s.slideId)}
                      />
                    ))}
                  </List>
                  {slides.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No slides for this accession. Create slides in Histology → Sectioning first.
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Record IHC stain
              </Typography>
              {!selectedSlideId ? (
                <Typography color="text.secondary">Select a slide from the list to record an IHC stain.</Typography>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Slide: <strong>{selectedSlideId}</strong>
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        required
                        label="Antibody"
                        value={antibody}
                        onChange={(e) => setAntibody(e.target.value)}
                        placeholder="e.g. ER, PR, Ki67"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Clone" value={clone} onChange={(e) => setClone(e.target.value)} placeholder="e.g. SP1" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Dilution" value={dilution} onChange={(e) => setDilution(e.target.value)} placeholder="e.g. 1:100" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Antigen retrieval"
                        value={antigenRetrieval}
                        onChange={(e) => setAntigenRetrieval(e.target.value)}
                        placeholder="e.g. EDTA pH 9"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Detection method"
                        value={detectionMethod}
                        onChange={(e) => setDetectionMethod(e.target.value)}
                        placeholder="e.g. DAB, Polymer"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Counterstain" value={counterstain} onChange={(e) => setCounterstain(e.target.value)} placeholder="e.g. Hematoxylin" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>QC status</InputLabel>
                        <Select value={qcStatus} label="QC status" onChange={(e) => setQcStatus(e.target.value)}>
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="passed">Passed</MenuItem>
                          <MenuItem value="failed">Failed</MenuItem>
                          <MenuItem value="rejected">Rejected</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={1} />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        onClick={() => addStain.mutate()}
                        disabled={!antibody.trim() || addStain.isPending}
                      >
                        Record IHC stain
                      </Button>
                    </Grid>
                  </Grid>

                  {stains.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                        Existing IHC stains for this slide
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Antibody</TableCell>
                              <TableCell>Clone</TableCell>
                              <TableCell>Dilution</TableCell>
                              <TableCell>AR</TableCell>
                              <TableCell>Detection</TableCell>
                              <TableCell>QC</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {stains.map((r: IHCStainRecord) => (
                              <TableRow key={r._id}>
                                <TableCell>{r.antibody}</TableCell>
                                <TableCell>{r.clone || '—'}</TableCell>
                                <TableCell>{r.dilution || '—'}</TableCell>
                                <TableCell>{r.antigenRetrieval || '—'}</TableCell>
                                <TableCell>{r.detectionMethod || '—'}</TableCell>
                                <TableCell>{r.qcStatus}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
