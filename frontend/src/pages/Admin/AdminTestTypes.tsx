import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { testTypesApi, settingsApi } from '../../api/endpoints';
import type { TestType } from '../../api/endpoints';
import { formatPrice, priceLabel } from '../../utils/currency';

const emptyForm = {
  code: '',
  name: '',
  description: '',
  category: '',
  price: '' as string | number,
  turnaroundHours: '' as string | number,
  active: true,
};

export default function AdminTestTypes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TestType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: testTypes, isLoading } = useQuery({
    queryKey: ['test-types', 'admin', search],
    queryFn: () => testTypesApi.list({ search: search || undefined }).then((r) => r.data),
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  });
  const currency = settings?.currency ?? 'USD';

  const createMutation = useMutation({
    mutationFn: (data: Partial<TestType>) => testTypesApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-types'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'services'] });
      handleClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Failed to create');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestType> }) =>
      testTypesApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-types'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'services'] });
      handleClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || 'Failed to update');
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError('');
    createMutation.reset();
    updateMutation.reset();
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (t: TestType) => {
    setEditing(t);
    setForm({
      code: t.code,
      name: t.name,
      description: t.description ?? '',
      category: t.category ?? '',
      price: t.price ?? '',
      turnaroundHours: t.turnaroundHours ?? '',
      active: t.active !== false,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code) {
      setError('Code is required');
      return;
    }
    if (!name) {
      setError('Name is required');
      return;
    }
    const priceNum = form.price === '' ? undefined : Number(form.price);
    if (priceNum !== undefined && (Number.isNaN(priceNum) || priceNum < 0)) {
      setError('Price must be a number ≥ 0');
      return;
    }
    const turnaroundNum = form.turnaroundHours === '' ? undefined : Number(form.turnaroundHours);
    const payload = {
      code,
      name,
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      price: priceNum,
      turnaroundHours: turnaroundNum !== undefined && Number.isInteger(turnaroundNum) && turnaroundNum >= 0 ? turnaroundNum : undefined,
      active: form.active,
    };
    if (editing) {
      updateMutation.mutate({ id: editing._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const rows = testTypes ?? [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Test types
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Create test type
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Prices use the system currency (XAF, USD, or EUR) and are shown on the public landing page. Only active test types appear there.
      </Typography>
      <Card>
        <Box sx={{ p: 2 }}>
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Code or name"
          />
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">{priceLabel(currency)}</TableCell>
                <TableCell>Active</TableCell>
                <TableCell width={60} />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow>
              ) : (
                rows.map((t: TestType) => (
                  <TableRow key={t._id}>
                    <TableCell><strong>{t.code}</strong></TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>{t.category || '—'}</TableCell>
                    <TableCell align="right">{formatPrice(t.price, currency)}</TableCell>
                    <TableCell>{t.active !== false ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openEdit(t)} aria-label="Edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editing ? 'Edit test type' : 'Create test type'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && (
              <Typography color="error" variant="body2">{error}</Typography>
            )}
            <TextField
              label="Code"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              required
              disabled={!!editing}
              placeholder="e.g. HE, IHC"
              helperText={editing ? 'Code cannot be changed' : undefined}
            />
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g. Histology Examination"
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              multiline
              minRows={2}
              placeholder="Optional short description"
            />
            <TextField
              label="Category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Histology, Cytology"
            />
            <TextField
              label={priceLabel(currency)}
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="0.00"
              helperText="Shown on the public landing page"
            />
            <TextField
              label="Turnaround (hours)"
              type="number"
              inputProps={{ min: 0, step: 1 }}
              value={form.turnaroundHours}
              onChange={(e) => setForm((f) => ({ ...f, turnaroundHours: e.target.value }))}
              placeholder="e.g. 48"
              helperText="Optional. Typical turnaround in hours; shown on public service detail."
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
              }
              label="Active (shown on landing page)"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
