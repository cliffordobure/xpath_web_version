import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Autocomplete,
  CircularProgress,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { ordersApi, patientsApi, testTypesApi, doctorsApi } from '../../api/endpoints';
import type { Patient, TestType, Doctor } from '../../api/endpoints';

export default function OrderCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [selectedPatientValue, setSelectedPatientValue] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSearchDebounced, setPatientSearchDebounced] = useState('');
  const [testTypeIds, setTestTypeIds] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setPatientSearchDebounced(patientSearch), 300);
    return () => clearTimeout(t);
  }, [patientSearch]);
  const [priority, setPriority] = useState('normal');
  const [referringDoctorId, setReferringDoctorId] = useState<string | null>(null);
  const [referringDoctor, setReferringDoctor] = useState('');
  const [notes, setNotes] = useState('');

  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [lastCreatedPatient, setLastCreatedPatient] = useState<Patient | null>(null);
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '' as '' | 'male' | 'female' | 'other',
    phone: '',
    email: '',
    address: '',
    nationalId: '',
    referringDoctor: '',
    notes: '',
  });

  const { data: patientsRes } = useQuery({
    queryKey: ['patients', patientSearchDebounced],
    queryFn: () => patientsApi.list({ search: patientSearchDebounced || undefined, limit: 20 }).then((r) => r.data),
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
  const patients = patientsRes?.data ?? [];

  const { data: testTypes } = useQuery({
    queryKey: ['test-types'],
    queryFn: () => testTypesApi.list().then((r) => r.data),
  });
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorsApi.list,
  });

  const createPatient = useMutation({
    mutationFn: (data: Parameters<typeof patientsApi.create>[0]) => patientsApi.create(data).then((r) => r.data),
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setLastCreatedPatient(patient);
      setPatientId(patient._id);
      setSelectedPatientValue(patient);
      setNewPatientOpen(false);
      setNewPatient({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
        nationalId: '',
        referringDoctor: '',
        notes: '',
      });
    },
  });

  const createOrder = useMutation({
    mutationFn: () =>
      ordersApi
        .create({
          patient: patientId!,
          testTypes: testTypeIds,
          priority,
          referringDoctorId: referringDoctorId || undefined,
          referringDoctor: referringDoctor || undefined,
          notes: notes || undefined,
        })
        .then((r) => r.data),
    onSuccess: (order) => {
      navigate(`/orders/${order._id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    createOrder.mutate();
  };

  const handleRegisterPatient = () => {
    createPatient.mutate({
      firstName: newPatient.firstName.trim(),
      lastName: newPatient.lastName.trim(),
      dateOfBirth: newPatient.dateOfBirth || undefined,
      gender: newPatient.gender || undefined,
      phone: newPatient.phone.trim() || undefined,
      email: newPatient.email.trim() || undefined,
      address: newPatient.address.trim() || undefined,
      nationalId: newPatient.nationalId.trim() || undefined,
      referringDoctor: newPatient.referringDoctor.trim() || undefined,
      notes: newPatient.notes.trim() || undefined,
    });
  };

  const patientOptions = useMemo(() => {
    const base =
      lastCreatedPatient && patientId === lastCreatedPatient._id
        ? [lastCreatedPatient, ...patients.filter((p) => p._id !== lastCreatedPatient._id)]
        : patients;
    const currentSelected =
      selectedPatientValue && selectedPatientValue._id === patientId
        ? selectedPatientValue
        : patientId
          ? base.find((p) => p._id === patientId) ?? null
          : null;
    if (currentSelected && !base.some((p) => p._id === currentSelected._id))
      return [currentSelected, ...base];
    return base;
  }, [patients, lastCreatedPatient, patientId, selectedPatientValue]);

  const selectedPatient =
    selectedPatientValue && selectedPatientValue._id === patientId
      ? selectedPatientValue
      : patientId
        ? patientOptions.find((p) => p._id === patientId) ?? null
        : null;

  const getPatientLabel = (p: Patient) => `${p.firstName} ${p.lastName}${p.phone ? ` — ${p.phone}` : ''}`;
  const handlePatientInputChange = (_: unknown, v: string) => {
    if (selectedPatientValue && v === getPatientLabel(selectedPatientValue)) return;
    setPatientSearch(v);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Create order
      </Typography>
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {createOrder.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {(createOrder.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (createOrder.error instanceof Error ? createOrder.error.message : 'Failed to create order')}
              </Alert>
            )}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
              <Autocomplete
                options={patientOptions}
                getOptionLabel={getPatientLabel}
                value={selectedPatient}
                isOptionEqualToValue={(a, b) => a._id === b._id}
                onInputChange={handlePatientInputChange}
                onChange={(_, p) => {
                  setPatientId(p?._id ?? null);
                  setSelectedPatientValue(p ?? null);
                }}
                renderInput={(params) => <TextField {...params} label="Patient" required />}
                sx={{ flex: 1 }}
              />
              <Button
                type="button"
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={() => setNewPatientOpen(true)}
                sx={{ mt: 1, flexShrink: 0 }}
              >
                Register new patient
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: -1, mb: 2 }}>
              Search for an existing patient or register a new one (e.g. walk-in or clinic referral).
            </Typography>
            <Autocomplete
              multiple
              options={testTypes ?? []}
              getOptionLabel={(t: TestType) => `${t.code} — ${t.name}`}
              value={(testTypes ?? []).filter((t) => testTypeIds.includes(t._id))}
              onChange={(_, v) => setTestTypeIds(v.map((t) => t._id))}
              renderInput={(params) => <TextField {...params} label="Test types" />}
              sx={{ mb: 2 }}
            />
            <TextField
              select
              fullWidth
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="stat">Stat</MenuItem>
            </TextField>
            <TextField
              select
              fullWidth
              label="Referring doctor / clinic"
              value={referringDoctorId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setReferringDoctorId(v || null);
                if (v) {
                  const d = doctors.find((x: Doctor) => x._id === v);
                  setReferringDoctor(d ? d.name : '');
                } else setReferringDoctor('');
              }}
              sx={{ mb: 2 }}
            >
              <MenuItem value="">— None / Other</MenuItem>
              {(doctors as Doctor[]).filter((d) => d.active !== false).map((d) => (
                <MenuItem key={d._id} value={d._id}>{d.name}{d.code ? ` (${d.code})` : ''} — {d.type}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth label="Referring doctor (free text if not in list)" value={referringDoctor} onChange={(e) => setReferringDoctor(e.target.value)} sx={{ mb: 2 }} placeholder="Name if not selected above" />
            <TextField fullWidth label="Notes" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button type="submit" variant="contained" disabled={!patientId || createOrder.isPending}>
                {createOrder.isPending ? <CircularProgress size={24} /> : 'Create order'}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/orders')}>
                Cancel
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Register new patient dialog */}
      <Dialog open={newPatientOpen} onClose={() => setNewPatientOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Register new patient</DialogTitle>
        <DialogContent>
          {createPatient.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {(createPatient.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to register patient'}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add a new patient (walk-in or referred by clinic), then they will be selected for this order.
          </Typography>
          <TextField fullWidth label="First name" value={newPatient.firstName} onChange={(e) => setNewPatient((f) => ({ ...f, firstName: e.target.value }))} margin="normal" required />
          <TextField fullWidth label="Last name" value={newPatient.lastName} onChange={(e) => setNewPatient((f) => ({ ...f, lastName: e.target.value }))} margin="normal" required />
          <TextField fullWidth label="Date of birth" type="date" value={newPatient.dateOfBirth} onChange={(e) => setNewPatient((f) => ({ ...f, dateOfBirth: e.target.value }))} margin="normal" InputLabelProps={{ shrink: true }} />
          <TextField fullWidth select label="Gender" value={newPatient.gender} onChange={(e) => setNewPatient((f) => ({ ...f, gender: e.target.value as typeof newPatient.gender }))} margin="normal">
            <MenuItem value="">—</MenuItem>
            <MenuItem value="male">Male</MenuItem>
            <MenuItem value="female">Female</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          <TextField fullWidth label="Phone" value={newPatient.phone} onChange={(e) => setNewPatient((f) => ({ ...f, phone: e.target.value }))} margin="normal" />
          <TextField fullWidth label="Email" type="email" value={newPatient.email} onChange={(e) => setNewPatient((f) => ({ ...f, email: e.target.value }))} margin="normal" />
          <TextField fullWidth label="Address" value={newPatient.address} onChange={(e) => setNewPatient((f) => ({ ...f, address: e.target.value }))} margin="normal" />
          <TextField fullWidth label="National ID" value={newPatient.nationalId} onChange={(e) => setNewPatient((f) => ({ ...f, nationalId: e.target.value }))} margin="normal" />
          <TextField fullWidth label="Referring doctor / clinic" value={newPatient.referringDoctor} onChange={(e) => setNewPatient((f) => ({ ...f, referringDoctor: e.target.value }))} margin="normal" placeholder="If referred by clinic" />
          <TextField fullWidth label="Notes" multiline rows={2} value={newPatient.notes} onChange={(e) => setNewPatient((f) => ({ ...f, notes: e.target.value }))} margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewPatientOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRegisterPatient} disabled={!newPatient.firstName.trim() || !newPatient.lastName.trim() || createPatient.isPending}>
            {createPatient.isPending ? <CircularProgress size={24} /> : 'Register and select'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
