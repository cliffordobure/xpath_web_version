import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  List,
  ListItemButton,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Logo } from '../components/Logo';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ClearIcon from '@mui/icons-material/Clear';
import { publicApi } from '../api/endpoints';
import { formatPrice } from '../utils/currency';

type PlaceResult = { display_name: string; lat: string; lon: string };

async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
    { headers: { Accept: 'application/json', 'Accept-Language': 'en', 'User-Agent': 'XPathLIMS-OrderOnline/1.0' } }
  );
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default function OrderOnline() {
  const [successOrderNumber, setSuccessOrderNumber] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    pickupAddress: '',
    pickupPlaceName: '',
    pickupLat: undefined as number | undefined,
    pickupLng: undefined as number | undefined,
    testTypes: [] as string[],
    referringDoctor: '',
    notes: '',
  });
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeSearchDebounced, setPlaceSearchDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setPlaceSearchDebounced(placeSearch), 400);
    return () => clearTimeout(t);
  }, [placeSearch]);

  const runSearch = useCallback(async () => {
    if (!placeSearchDebounced.trim()) {
      setPlaceResults([]);
      return;
    }
    setPlaceSearching(true);
    try {
      const results = await searchPlaces(placeSearchDebounced);
      setPlaceResults(results);
    } catch {
      setPlaceResults([]);
    } finally {
      setPlaceSearching(false);
    }
  }, [placeSearchDebounced]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const { data: config } = useQuery({
    queryKey: ['public', 'config'],
    queryFn: publicApi.getConfig,
    staleTime: 5 * 60 * 1000,
  });
  const currency = config?.currency ?? 'USD';

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['public', 'services'],
    queryFn: publicApi.getServices,
    staleTime: 5 * 60 * 1000,
  });

  const submit = useMutation({
    mutationFn: () =>
      publicApi.submitOrderRequest({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        pickupAddress: form.pickupAddress.trim() || undefined,
        pickupPlaceName: form.pickupPlaceName.trim() || undefined,
        pickupLat: form.pickupLat,
        pickupLng: form.pickupLng,
        testTypes: form.testTypes,
        referringDoctor: form.referringDoctor.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: (data) => {
      setSuccessOrderNumber(data.orderNumber);
    },
  });

  const hasPickupLocation =
    (form.pickupLat != null && form.pickupLng != null) || !!form.pickupAddress.trim() || !!form.address.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.testTypes.length === 0 || !hasPickupLocation) return;
    submit.mutate();
  };

  const update = (key: keyof typeof form, value: string | string[] | number | undefined) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const selectPlace = (place: PlaceResult) => {
    setForm((f) => ({
      ...f,
      pickupPlaceName: place.display_name,
      pickupLat: parseFloat(place.lat),
      pickupLng: parseFloat(place.lon),
    }));
    setPlaceSearch('');
    setPlaceResults([]);
  };

  const clearPlace = () => {
    setForm((f) => ({ ...f, pickupPlaceName: '', pickupLat: undefined, pickupLng: undefined }));
  };

  if (successOrderNumber) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'primary.main',
          background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #0d47a1 100%)',
          py: 4,
          px: 2,
        }}
      >
        <Box sx={{ maxWidth: 560, margin: '0 auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Logo height={48} variant="light" />
          </Box>
          <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 1 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Order received
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Your order number is <strong>{successOrderNumber}</strong>. Save it to track your order.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                A courier will be notified to pick up your sample from the pickup address you provided. Once the sample
                reaches the lab, we will process your tests. Log in to the Patient portal with your order number and details to securely track your order in real time.
              </Typography>
              <Button component={Link} to="/patient-portal" variant="contained" sx={{ mr: 1 }}>
                Log in to Patient portal to track order
              </Button>
              <Button component={Link} to="/" variant="outlined">
                Back to home
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'primary.main',
        background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #0d47a1 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 640, margin: '0 auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
          <Logo height={48} variant="light" />
        </Box>
        <Typography variant="h5" fontWeight={700} sx={{ color: 'white', textAlign: 'center', mb: 0.5 }}>
          Order online
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', mb: 3 }}>
          Request a test. We’ll send a courier to pick up your sample from your location (home or hospital).
        </Typography>

        <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <CardContent sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              {submit.isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {(submit.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                    'Failed to submit order. Try again.'}
                </Alert>
              )}
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1 }}>
                Patient / contact
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <TextField
                  required
                  fullWidth
                  label="First name"
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                />
                <TextField
                  required
                  fullWidth
                  label="Last name"
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="Date of birth"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={form.dateOfBirth}
                  onChange={(e) => update('dateOfBirth', e.target.value)}
                />
                <TextField
                  required
                  fullWidth
                  label="Phone (courier will call this number)"
                  placeholder="e.g. 0759466446"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </Box>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                sx={{ mb: 2 }}
              />
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1, mt: 2 }}>
                Pickup location (required)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Search for the place where our courier should pick up your sample. The courier will get the exact location and your phone number.
              </Typography>
              <TextField
                fullWidth
                label="Search for a place (address, city, or landmark)"
                placeholder="e.g. 123 Main St, Nairobi or Kenyatta Hospital"
                value={placeSearch}
                onChange={(e) => setPlaceSearch(e.target.value)}
                sx={{ mb: 0.5 }}
                InputProps={{
                  startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
              {placeSearching && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">Searching…</Typography>
                </Box>
              )}
              {placeResults.length > 0 && !form.pickupPlaceName && (
                <Paper variant="outlined" sx={{ maxHeight: 220, overflow: 'auto', mb: 1 }}>
                  <List dense>
                    {placeResults.map((place) => (
                      <ListItemButton key={`${place.lat}-${place.lon}`} onClick={() => selectPlace(place)}>
                        <Typography variant="body2">{place.display_name}</Typography>
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>
              )}
              {form.pickupPlaceName && (
                <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'success.50', borderColor: 'success.main' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>Pickup at: {form.pickupPlaceName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Coordinates: {form.pickupLat?.toFixed(5)}, {form.pickupLng?.toFixed(5)}
                      </Typography>
                    </Box>
                    <Button size="small" startIcon={<ClearIcon />} onClick={clearPlace} color="inherit">
                      Change
                    </Button>
                  </Box>
                </Paper>
              )}
              {!hasPickupLocation && (
                <Typography variant="caption" color="error" display="block" sx={{ mb: 1 }}>
                  Please search and select a pickup location above.
                </Typography>
              )}
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1, mt: 2 }}>
                Tests requested
              </Typography>
              <FormControl fullWidth required sx={{ mb: 2 }}>
                <InputLabel>Select tests</InputLabel>
                <Select
                  multiple
                  value={form.testTypes}
                  onChange={(e) => update('testTypes', e.target.value as string[])}
                  label="Select tests"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((id) => {
                        const s = services.find((t) => t._id === id);
                        return <Chip key={id} size="small" label={s ? `${s.code} – ${s.name}` : id} />;
                      })}
                    </Box>
                  )}
                >
                  {services.map((s) => (
                    <MenuItem key={s._id} value={s._id}>
                      {s.code} – {s.name}
                      {s.price != null && s.price > 0 && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          {formatPrice(s.price, currency)}
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>At least one test is required. Our courier will collect the sample from you.</FormHelperText>
              </FormControl>
              <TextField
                fullWidth
                label="Referring doctor (optional)"
                value={form.referringDoctor}
                onChange={(e) => update('referringDoctor', e.target.value)}
                sx={{ mb: 1 }}
              />
              <TextField
                fullWidth
                label="Notes (optional)"
                multiline
                rows={2}
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                sx={{ mb: 3 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LocalShippingIcon color="action" />
                <Typography variant="body2" color="text.secondary">
                  After you submit, an available courier will be notified to pick up your sample. You can track the order in the Patient portal.
                </Typography>
              </Box>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={submit.isPending || loadingServices || form.testTypes.length === 0 || !hasPickupLocation}
              >
                {submit.isPending ? 'Submitting…' : 'Submit order'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, color: 'rgba(255,255,255,0.8)' }}>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Back to home
          </Link>
          {' · '}
          <Link to="/patient-portal" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Patient portal
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
