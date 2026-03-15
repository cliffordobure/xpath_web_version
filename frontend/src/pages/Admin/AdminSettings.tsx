import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Alert,
  Grid,
} from '@mui/material';
import { useLocaleStore } from '../../stores/localeStore';
import { t } from '../../i18n/translations';
import { settingsApi, testTypesApi, SUPPORTED_CURRENCIES, type SystemSettingsPayload } from '../../api/endpoints';
import type { TestType } from '../../api/endpoints';

const TIMEZONES = [
  'UTC',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { locale, setLocale } = useLocaleStore();
  const [labName, setLabName] = useState('');
  const [tagline, setTagline] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [accreditationsStr, setAccreditationsStr] = useState('');
  const [timezone, setTimezone] = useState('');
  const [currency, setCurrency] = useState<string>('USD');
  const [testTypeForm, setTestTypeForm] = useState({ code: '', name: '', price: '', category: '' });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  });
  useEffect(() => {
    if (settings) {
      setLabName(settings.labName ?? '');
      setTagline(settings.tagline ?? '');
      setAboutText(settings.aboutText ?? '');
      setContactEmail(settings.contactEmail ?? '');
      setContactPhone(settings.contactPhone ?? '');
      setContactAddress(settings.contactAddress ?? '');
      setBusinessHours(settings.businessHours ?? '');
      setAccreditationsStr(Array.isArray(settings.accreditations) ? settings.accreditations.join(', ') : '');
      setTimezone(settings.timezone ?? 'UTC');
      setCurrency(settings.currency ?? 'USD');
    }
  }, [settings]);

  useQuery({
    queryKey: ['test-types'],
    queryFn: () => testTypesApi.list().then((r) => r.data),
  });

  const updateSettings = useMutation({
    mutationFn: (data: SystemSettingsPayload) => settingsApi.update(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'config'] });
    },
  });

  const createTestType = useMutation({
    mutationFn: (data: Partial<TestType>) => testTypesApi.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-types'] });
      setTestTypeForm({ code: '', name: '', price: '', category: '' });
    },
  });

  const handleSaveSettings = () => {
    const payload: SystemSettingsPayload = {
      labName: labName.trim() || undefined,
      tagline: tagline.trim() || undefined,
      aboutText: aboutText.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      contactAddress: contactAddress.trim() || undefined,
      businessHours: businessHours.trim() || undefined,
      accreditations: accreditationsStr.trim() ? accreditationsStr.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : undefined,
      timezone: timezone || 'UTC',
      currency: SUPPORTED_CURRENCIES.includes(currency as 'XAF' | 'USD' | 'EUR') ? currency : undefined,
    };
    updateSettings.mutate(payload);
  };

  const handleAddTestType = () => {
    const price = parseFloat(testTypeForm.price);
    if (!testTypeForm.code.trim() || !testTypeForm.name.trim()) return;
    createTestType.mutate({
      code: testTypeForm.code.trim(),
      name: testTypeForm.name.trim(),
      price: Number.isFinite(price) ? price : undefined,
      category: testTypeForm.category.trim() || undefined,
    });
  };

  const currentLocale = locale;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {t(currentLocale, 'systemSettings.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t(currentLocale, 'systemSettings.description')}
      </Typography>

      <Grid container spacing={3}>
        {/* Language */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                {t(currentLocale, 'systemSettings.language')}
              </Typography>
              <TextField
                fullWidth
                select
                value={currentLocale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'fr')}
                label={t(currentLocale, 'systemSettings.language')}
              >
                <MenuItem value="en">{t(currentLocale, 'systemSettings.english')}</MenuItem>
                <MenuItem value="fr">{t(currentLocale, 'systemSettings.french')}</MenuItem>
              </TextField>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                App language (sidebar, headers, this page). Stored in your browser.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Public lab information (landing page, patient-facing) */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Public lab information (landing page & contact)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Shown on the public website. Leave blank to use defaults or hide contact details.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Lab name" value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="X-PATH LIMS" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Tagline (hero)" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Reliable results. Clear pricing. Fast turnaround." />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth multiline rows={3} label="About text" value={aboutText} onChange={(e) => setAboutText(e.target.value)} placeholder="Short description for About section" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth label="Contact email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <TextField fullWidth label="Contact phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Address" value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Business hours" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} placeholder="Mon–Fri 8:00–18:00" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Accreditations (comma-separated)" value={accreditationsStr} onChange={(e) => setAccreditationsStr(e.target.value)} placeholder="CAP, ISO 15189" />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Lab name, timezone, currency & save */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                {t(currentLocale, 'systemSettings.timezone')} & currency
              </Typography>
              {updateSettings.isSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>{t(currentLocale, 'systemSettings.saved')}</Alert>
              )}
              {updateSettings.isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {(updateSettings.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save'}
                </Alert>
              )}
              <TextField
                fullWidth
                select
                label={t(currentLocale, 'systemSettings.timezone')}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                margin="normal"
              >
                {TIMEZONES.map((tz) => (
                  <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                select
                label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                margin="normal"
                helperText="Supported: XAF, USD, EUR. Used for prices and payments."
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
              <Button variant="contained" onClick={handleSaveSettings} disabled={settingsLoading || updateSettings.isPending} sx={{ mt: 2 }}>
                {t(currentLocale, 'systemSettings.save')}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Add test type */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                {t(currentLocale, 'systemSettings.testTypes')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', mb: 2 }}>
                <TextField
                  size="small"
                  label={t(currentLocale, 'systemSettings.code')}
                  value={testTypeForm.code}
                  onChange={(e) => setTestTypeForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. HE"
                  sx={{ minWidth: 100 }}
                />
                <TextField
                  size="small"
                  label={t(currentLocale, 'systemSettings.name')}
                  value={testTypeForm.name}
                  onChange={(e) => setTestTypeForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Histology"
                  sx={{ minWidth: 180 }}
                />
                <TextField
                  size="small"
                  type="number"
                  label={t(currentLocale, 'systemSettings.price')}
                  value={testTypeForm.price}
                  onChange={(e) => setTestTypeForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0"
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ minWidth: 100 }}
                />
                <TextField
                  size="small"
                  label={t(currentLocale, 'systemSettings.category')}
                  value={testTypeForm.category}
                  onChange={(e) => setTestTypeForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Optional"
                  sx={{ minWidth: 120 }}
                />
                <Button variant="contained" onClick={handleAddTestType} disabled={!testTypeForm.code.trim() || !testTypeForm.name.trim() || createTestType.isPending}>
                  {t(currentLocale, 'systemSettings.add')}
                </Button>
              </Box>
              {createTestType.isError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {(createTestType.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add test type'}
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary">
                {t(currentLocale, 'systemSettings.manageTestTypes')}: <Link to="/admin/test-types">Test types</Link>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
