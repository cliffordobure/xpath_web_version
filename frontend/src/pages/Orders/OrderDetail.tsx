import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Grid,
  TextField,
  Autocomplete,
  Alert,
  MenuItem,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import { ordersApi, reportsApi, patientsApi, testTypesApi, doctorsApi } from '../../api/endpoints';
import type { Patient, TestType } from '../../api/endpoints';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [editing, setEditing] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSearchDebounced, setPatientSearchDebounced] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    const t = setTimeout(() => setPatientSearchDebounced(patientSearch), 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [editPatientValue, setEditPatientValue] = useState<Patient | null>(null);
  const [editTestTypeIds, setEditTestTypeIds] = useState<string[]>([]);
  const [editPriority, setEditPriority] = useState('normal');
  const [editReferringDoctorId, setEditReferringDoctorId] = useState<string | null>(null);
  const [editReferringDoctor, setEditReferringDoctor] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (!order || !editing) return;
    const patient = typeof order.patient === 'object' ? order.patient : null;
    const patientId = patient ? patient._id : typeof order.patient === 'string' ? order.patient : null;
    setEditPatientId(patientId);
    setEditPatientValue(patient ?? null);
    setEditTestTypeIds((order.testTypes ?? []).map((t) => (typeof t === 'object' ? t._id : t)));
    setEditPriority(order.priority || 'normal');
    const refId = order.referringDoctorId && typeof order.referringDoctorId === 'object' ? (order.referringDoctorId as { _id: string })._id : typeof order.referringDoctorId === 'string' ? order.referringDoctorId : null;
    setEditReferringDoctorId(refId || null);
    setEditReferringDoctor(order.referringDoctor ?? '');
    setEditNotes(order.notes ?? '');
  }, [order, editing]);

  const { data: patientsRes } = useQuery({
    queryKey: ['patients', patientSearchDebounced],
    queryFn: () => patientsApi.list({ search: patientSearchDebounced || undefined, limit: 20 }).then((r) => r.data),
    enabled: editing && !!id,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const patients = patientsRes?.data ?? [];

  const { data: testTypesData } = useQuery({
    queryKey: ['test-types'],
    queryFn: () => testTypesApi.list().then((r) => r.data),
    enabled: editing && !!id,
  });
  const testTypesList = testTypesData ?? [];

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorsApi.list,
    enabled: editing && !!id,
  });

  const updateOrder = useMutation({
    mutationFn: (payload: { patient?: string; testTypes?: string[]; priority?: string; referringDoctorId?: string; referringDoctor?: string; notes?: string }) =>
      ordersApi.update(id!, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setEditing(false);
    },
  });

  const handleSaveEdit = () => {
    if (!editPatientId) return;
    updateOrder.mutate({
      patient: editPatientId,
      testTypes: editTestTypeIds,
      priority: editPriority,
      referringDoctorId: editReferringDoctorId ?? undefined,
      referringDoctor: editReferringDoctor.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });
  };

  if (!id || isLoading || !order) {
    return (
      <Box>
        <Typography>Loading…</Typography>
      </Box>
    );
  }

  const patient = typeof order.patient === 'object' ? order.patient : null;
  const testTypes = order.testTypes ?? [];

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const res = await reportsApi.downloadPdf(order._id);
      const name = `report-${(order.orderNumber || order._id).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      downloadBlob(res.data as Blob, name);
    } catch (e) {
      console.error('PDF download failed:', e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const patientOptions = editPatientValue && !patients.some((p) => p._id === editPatientValue._id)
    ? [editPatientValue, ...patients]
    : patients;
  const selectedPatient = editPatientId ? patientOptions.find((p) => p._id === editPatientId) ?? editPatientValue : null;
  const getPatientLabel = (p: Patient) => `${p.firstName} ${p.lastName}${p.phone ? ` — ${p.phone}` : ''}`;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')}>
          Back to orders
        </Button>
        <Button
          variant="contained"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
        >
          {downloadingPdf ? 'Downloading…' : 'Download report PDF'}
        </Button>
        {!editing ? (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
            Edit order
          </Button>
        ) : (
          <>
            <Button variant="contained" onClick={handleSaveEdit} disabled={updateOrder.isPending || !editPatientId}>
              {updateOrder.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            <Button variant="outlined" onClick={() => setEditing(false)} disabled={updateOrder.isPending}>
              Cancel
            </Button>
          </>
        )}
      </Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Order {order.orderNumber}
      </Typography>

      {editing && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Edit order
            </Typography>
            {updateOrder.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {(updateOrder.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                  (updateOrder.error instanceof Error ? updateOrder.error.message : 'Failed to update order')}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Autocomplete<Patient>
                  options={patientOptions}
                  getOptionLabel={getPatientLabel}
                  value={selectedPatient}
                  isOptionEqualToValue={(a, b) => a._id === b._id}
                  onInputChange={(_, v) => setPatientSearch(v)}
                  onChange={(_, p) => {
                    setEditPatientId(p?._id ?? null);
                    setEditPatientValue(p ?? null);
                  }}
                  renderInput={(params) => <TextField {...params} label="Patient" required />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  multiple
                  options={testTypesList}
                  getOptionLabel={(t: TestType) => `${t.code} — ${t.name}`}
                  value={testTypesList.filter((t: TestType) => editTestTypeIds.includes(t._id))}
                  onChange={(_, v) => setEditTestTypeIds(v.map((t: TestType) => t._id))}
                  renderInput={(params) => <TextField {...params} label="Test types" />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Priority"
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                >
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                  <MenuItem value="stat">Stat</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Autocomplete
                  options={doctors}
                  getOptionLabel={(d) => d.name}
                  value={doctors.find((d) => d._id === editReferringDoctorId) ?? null}
                  onChange={(_, d) => setEditReferringDoctorId(d?._id ?? null)}
                  renderInput={(params) => <TextField {...params} label="Referring doctor" />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Referring doctor (free text)"
                  value={editReferringDoctor}
                  onChange={(e) => setEditReferringDoctor(e.target.value)}
                  placeholder="If not in list"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Status & priority
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip label={order.status} size="small" />
                <Chip label={order.priority} size="small" variant="outlined" />
              </Box>
              {(order.referringDoctorId && typeof order.referringDoctorId === 'object' && 'name' in order.referringDoctorId) ? (
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Referring: {(order.referringDoctorId as { name: string }).name}
                </Typography>
              ) : (
                order.referringDoctor && (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Referring doctor: {order.referringDoctor}
                  </Typography>
                )
              )}
              {order.notes && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Notes: {order.notes}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Patient
              </Typography>
              {patient ? (
                <>
                  <Typography variant="body1">
                    {patient.firstName} {patient.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {patient.phone || patient.email || '—'}
                  </Typography>
                </>
              ) : (
                <Typography>—</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Test types
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                {testTypes.map((t) => (
                  <Chip
                    key={typeof t === 'object' ? t._id : t}
                    label={typeof t === 'object' ? `${t.code} — ${t.name}` : t}
                    size="small"
                  />
                ))}
                {testTypes.length === 0 && <Typography variant="body2">None</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
