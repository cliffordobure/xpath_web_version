import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Logo } from '../components/Logo';
import ScienceIcon from '@mui/icons-material/Science';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LoginIcon from '@mui/icons-material/Login';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SpeedIcon from '@mui/icons-material/Speed';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BiotechIcon from '@mui/icons-material/Biotech';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import PeopleIcon from '@mui/icons-material/People';
import { publicApi } from '../api/endpoints';
import type { TestType } from '../api/endpoints';
import { formatPrice, priceLabel } from '../utils/currency';

// High-quality, royalty-free images (Unsplash) - professional lab/pathology theme
const HERO_IMAGE = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1920&q=80';
const IMG_HISTOLOGY = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&q=80'; // microscope (histology)
const IMG_LAB = 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&q=80'; // lab
const IMG_REPORTS = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80';

/** Map category name to a section image for pricing cards */
function getCategoryImage(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('histology') || c.includes('ihc') || c.includes('tissue')) return IMG_HISTOLOGY;
  if (c.includes('cytology') || c.includes('molecular') || c.includes('lab')) return IMG_LAB;
  return IMG_REPORTS;
}

const stats = [
  { label: 'Pathology tests', value: '500+', icon: <BiotechIcon sx={{ fontSize: 28 }} /> },
  { label: 'Typical turnaround', value: '24–48 hrs', icon: <SpeedIcon sx={{ fontSize: 28 }} /> },
  { label: 'Secure & compliant', value: 'HIPAA-ready', icon: <VerifiedUserIcon sx={{ fontSize: 28 }} /> },
];

const serviceCards = [
  {
    title: 'Histology & IHC',
    description: 'Tissue examination and immunohistochemistry for accurate diagnosis.',
    image: IMG_HISTOLOGY,
    icon: <LocalHospitalIcon sx={{ fontSize: 40 }} />,
    color: 'primary' as const,
  },
  {
    title: 'Cytology & Molecular',
    description: 'Cytology and molecular testing with clear turnaround times.',
    image: IMG_LAB,
    icon: <ScienceIcon sx={{ fontSize: 40 }} />,
    color: 'secondary' as const,
  },
  {
    title: 'Reports & tracking',
    description: 'Secure results and order tracking via the patient portal.',
    image: IMG_REPORTS,
    icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
    color: 'info' as const,
  },
];

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const navItems = [
  { label: 'Services', id: 'services' },
  { label: 'Prices', id: 'prices' },
  { label: 'About us', id: 'about' },
  { label: 'Contact', id: 'contact' },
];

export default function Landing() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const [detailService, setDetailService] = useState<TestType | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['public', 'config'],
    queryFn: publicApi.getConfig,
    staleTime: 5 * 60 * 1000,
  });
  const currency = config?.currency ?? 'USD';
  const labName = config?.labName ?? 'X-PATH LIMS';
  const tagline = config?.tagline ?? 'Reliable results. Clear pricing. Fast turnaround.';
  const aboutText = config?.aboutText ?? 'We are a pathology and molecular diagnostics laboratory committed to accurate diagnosis, transparent pricing, and timely reporting. Our team of pathologists and laboratory staff work with referring physicians and patients to deliver reliable results and secure, HIPAA-compliant reporting.';
  const accreditations = config?.accreditations?.length ? config.accreditations : ['CAP', 'ISO 15189'];
  const contactEmail = config?.contactEmail;
  const contactPhone = config?.contactPhone;
  const contactAddress = config?.contactAddress;
  const businessHours = config?.businessHours;

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['public', 'services'],
    queryFn: publicApi.getServices,
    staleTime: 5 * 60 * 1000,
  });

  const byCategory = services.reduce<Record<string, typeof services>>((acc, s) => {
    const cat = s.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fb' }}>
      {/* Header – clean bar with nav and actions */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          bgcolor: theme.palette.primary.dark,
          color: 'white',
          borderBottom: `1px solid ${alpha('#fff', 0.06)}`,
        }}
      >
        <Container maxWidth="lg" disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 64,
              gap: 2,
            }}
          >
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Logo height={38} variant="light" />
            </Box>

            {/* Desktop: nav links (center) + actions (right) */}
            {!isSmall && (
              <>
                <Box
                  component="nav"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {navItems.map(({ label, id }) => (
                    <Button
                      key={id}
                      size="small"
                      onClick={() => scrollToId(id)}
                      sx={{
                        color: alpha('#fff', 0.9),
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        px: 2,
                        py: 1.25,
                        '&:hover': {
                          bgcolor: alpha('#fff', 0.08),
                          color: 'white',
                        },
                        transition: 'background 0.2s, color 0.2s',
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  <Button
                    component={Link}
                    to="/login"
                    size="small"
                    startIcon={<LoginIcon sx={{ fontSize: 18 }} />}
                    sx={{
                      color: alpha('#fff', 0.95),
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      px: 2,
                      py: 1.25,
                      '&:hover': { bgcolor: alpha('#fff', 0.1) },
                      transition: 'background 0.2s',
                    }}
                  >
                    Staff login
                  </Button>
                  <Button
                    component={Link}
                    to="/order-online"
                    variant="contained"
                    size="medium"
                    sx={{
                      bgcolor: 'white',
                      color: theme.palette.primary.dark,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      px: 2.5,
                      py: 1.25,
                      borderRadius: 2,
                      boxShadow: 'none',
                      '&:hover': {
                        bgcolor: alpha('#fff', 0.95),
                        boxShadow: 'none',
                      },
                      transition: 'background 0.2s',
                    }}
                  >
                    Request test online
                  </Button>
                  <Button
                    component={Link}
                    to="/patient-portal"
                    size="small"
                    sx={{
                      color: alpha('#fff', 0.95),
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      px: 2,
                      py: 1.25,
                      '&:hover': { bgcolor: alpha('#fff', 0.1) },
                      transition: 'background 0.2s',
                    }}
                  >
                    Patient portal
                  </Button>
                </Box>
              </>
            )}

            {/* Mobile */}
            {isSmall && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Button
                  component={Link}
                  to="/order-online"
                  variant="contained"
                  size="small"
                  sx={{
                    bgcolor: 'white',
                    color: theme.palette.primary.dark,
                    fontWeight: 600,
                    px: 1.5,
                    py: 1,
                    '&:hover': { bgcolor: alpha('#fff', 0.95) },
                  }}
                >
                  Request test
                </Button>
                <IconButton
                  aria-label="Open menu"
                  onClick={() => setMobileMenuOpen(true)}
                  sx={{
                    color: 'white',
                    '&:hover': { bgcolor: alpha('#fff', 0.1) },
                  }}
                >
                  <MenuIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* Mobile drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: theme.palette.primary.dark,
            color: 'white',
          },
        }}
      >
        <Box sx={{ py: 2, px: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Menu</Typography>
            <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: 'white' }} aria-label="Close menu">
              <CloseIcon />
            </IconButton>
          </Box>
          <List disablePadding>
            {navItems.map(({ label, id }) => (
              <ListItem key={id} disablePadding>
                <ListItemButton
                  onClick={() => {
                    setMobileMenuOpen(false);
                    scrollToId(id);
                  }}
                  sx={{ color: 'white', '&:hover': { bgcolor: alpha('#fff', 0.12) } }}
                >
                  {label}
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/order-online" onClick={() => setMobileMenuOpen(false)} sx={{ color: 'white', '&:hover': { bgcolor: alpha('#fff', 0.12) } }}>
                Request test online
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/patient-portal" onClick={() => setMobileMenuOpen(false)} sx={{ color: 'white', '&:hover': { bgcolor: alpha('#fff', 0.12) } }}>
                Patient portal
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Hero – refined overlay, serif headline, subtle animation */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 480, md: 580 },
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `url(${HERO_IMAGE}) center/cover no-repeat`,
            transform: 'scale(1.02)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(112deg, ${alpha(theme.palette.primary.dark, 0.94)} 0%, ${alpha(theme.palette.primary.main, 0.88)} 40%, ${alpha(theme.palette.secondary.dark, 0.82)} 100%)`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 80% 50% at 70% 50%, ${alpha(theme.palette.secondary.main, 0.15)} 0%, transparent 50%)`,
            pointerEvents: 'none',
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 7, md: 10 }, px: 2 }}>
          <Box
            sx={{
              maxWidth: 680,
              animation: 'landingHeroFade 0.8s ease-out',
              '@keyframes landingHeroFade': {
                '0%': { opacity: 0, transform: 'translateY(16px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Typography
              variant="overline"
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                color: alpha('#fff', 0.85),
                letterSpacing: 3,
                fontWeight: 600,
                display: 'block',
                mb: 1.5,
              }}
            >
              Pathology & Laboratory Services
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: { xs: '2.25rem', sm: '2.75rem', md: '3.25rem' },
                fontWeight: 700,
                color: 'white',
                mb: 2,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
              }}
            >
              {tagline}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: alpha('#fff', 0.9),
                maxWidth: 520,
                mb: 4,
                fontSize: '1.125rem',
                lineHeight: 1.6,
              }}
            >
              Browse pathology and lab services with transparent pricing. Request tests online, track results in the patient portal, or sign in as staff to manage orders and workflows.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button
                component={Link}
                to="/login"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 20 }} />}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.dark',
                  fontWeight: 600,
                  px: 3.5,
                  py: 1.75,
                  borderRadius: 2,
                  boxShadow: `0 4px 14px ${alpha('#000', 0.25)}`,
                  '&:hover': {
                    bgcolor: alpha('#fff', 0.95),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 20px ${alpha('#000', 0.3)}`,
                  },
                  transition: 'all 0.25s ease',
                }}
              >
                Staff login
              </Button>
              <Button
                component={Link}
                to="/order-online"
                size="large"
                sx={{
                  border: '2px solid',
                  borderColor: 'white',
                  color: 'white',
                  fontWeight: 600,
                  px: 3.5,
                  py: 1.75,
                  borderRadius: 2,
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: alpha('#fff', 0.12),
                  },
                  transition: 'all 0.25s ease',
                }}
              >
                Request test online
              </Button>
              <Button
                component={Link}
                to="/patient-portal"
                size="large"
                sx={{
                  color: alpha('#fff', 0.95),
                  fontWeight: 500,
                  px: 2.5,
                  '&:hover': { bgcolor: alpha('#fff', 0.08) },
                  transition: 'all 0.2s ease',
                }}
              >
                Patient portal
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Stats strip – elevated cards */}
      <Box sx={{ py: 5, px: 2, bgcolor: 'transparent' }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} justifyContent="center">
            {stats.map(({ label, value, icon }) => (
              <Grid item xs={12} sm={4} key={label}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    height: '100%',
                    textAlign: 'center',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.12),
                    bgcolor: 'background.paper',
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.06)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'primary.main',
                      mx: 'auto',
                      mb: 1.5,
                    }}
                  >
                    {icon}
                  </Box>
                  <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                    {value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Services with images */}
      <Container maxWidth="lg" sx={{ py: 10, px: 2 }}>
        <Box id="services" sx={{ textAlign: 'center', mb: 7 }}>
          <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={2} sx={{ display: 'block', mb: 1.5 }}>
            What we offer
          </Typography>
          <Typography variant="h4" fontWeight={700} color="text.primary" gutterBottom sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2rem' }}>
            Pathology & lab services
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}>
            Histology, immunohistochemistry (IHC), cytology, and molecular testing with clear pricing and secure, timely reporting.
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ mb: 8 }}>
          {serviceCards.map(({ title, description, image, icon, color }) => (
            <Grid item xs={12} md={4} key={title}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.6),
                  boxShadow: `0 4px 24px ${alpha('#000', 0.06)}`,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.12)}`,
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                  },
                  '&:hover .MuiCardMedia-root': { transform: 'scale(1.06)' },
                }}
              >
                <Box sx={{ position: 'relative', overflow: 'hidden' }}>
                  <CardMedia
                    component="img"
                    height="220"
                    image={image}
                    alt={title}
                    sx={{
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '60%',
                      background: `linear-gradient(transparent, ${alpha(theme.palette.primary.dark, 0.6)})`,
                      pointerEvents: 'none',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: `${color}.main`,
                      boxShadow: theme.shadows[2],
                    }}
                  >
                    {icon}
                  </Box>
                </Box>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
                    {title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Why choose us / Precision strip */}
        <Box
          sx={{
            py: 6,
            px: 3,
            mb: 6,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.12),
          }}
        >
          <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={2} sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
            Precision & compliance
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            {[
              { icon: <ScienceIcon sx={{ fontSize: 32 }} />, text: 'Accredited pathology & histology practices' },
              { icon: <VerifiedUserIcon sx={{ fontSize: 32 }} />, text: 'Secure, HIPAA-ready reporting & data protection' },
              { icon: <PeopleIcon sx={{ fontSize: 32 }} />, text: 'Dedicated support for referring physicians and patients' },
            ].map(({ icon, text }, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </Box>
                  <Typography variant="body1" fontWeight={500} color="text.secondary" sx={{ lineHeight: 1.6, pt: 0.5 }}>
                    {text}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Pricing */}
        <Box id="prices" sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={2} sx={{ display: 'block', mb: 1.5 }}>
            Transparent pricing
          </Typography>
          <Typography variant="h4" fontWeight={700} color="text.primary" gutterBottom sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2rem' }}>
            Prices
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}>
            Current tests and prices. Contact the lab for package deals or bulk pricing.
          </Typography>
        </Box>

        {isLoading ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            Loading services…
          </Typography>
        ) : services.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
            <Typography color="text.secondary">
              No services or prices are currently listed. Check back later or contact the lab.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={4}>
            {Object.entries(byCategory).map(([category, items]) => (
              <Grid item xs={12} key={category}>
                <Card
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.divider, 0.5),
                    boxShadow: `0 4px 20px ${alpha('#000', 0.06)}`,
                    transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                    '&:hover': {
                      boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.08)}`,
                      borderColor: alpha(theme.palette.primary.main, 0.15),
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 200 }}>
                    <CardMedia
                      component="img"
                      image={getCategoryImage(category)}
                      alt={category}
                      sx={{
                        width: { xs: '100%', md: 320 },
                        minWidth: { md: 320 },
                        height: { xs: 200, md: 'auto' },
                        objectFit: 'cover',
                      }}
                    />
                    <CardContent sx={{ flex: 1, p: 0, display: 'flex', flexDirection: 'column' }}>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        sx={{
                          px: 3,
                          py: 2,
                          color: 'primary.main',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <ScienceIcon fontSize="small" />
                        {category}
                      </Typography>
                      <TableContainer sx={{ flex: 1 }}>
                        <Table size="medium">
                          <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                              <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Test / service</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>{priceLabel(currency)}</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 700, width: 56 }} />
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {items.map((s) => (
                              <TableRow
                                key={s._id}
                                hover
                                onClick={() => setDetailService(s)}
                                sx={{
                                  cursor: 'pointer',
                                  '&:nth-of-type(even)': { bgcolor: alpha('#000', 0.02) },
                                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                }}
                              >
                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 500 }}>{s.code}</TableCell>
                                <TableCell>
                                  <Typography fontWeight={600}>{s.name}</Typography>
                                  {s.description && (
                                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 280 }}>
                                      {s.description}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>{formatPrice(s.price, currency)}</TableCell>
                                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                  <IconButton size="small" color="primary" onClick={() => setDetailService(s)} aria-label="View details">
                                    <InfoOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Service detail dialog */}
        <Dialog
          open={!!detailService}
          onClose={() => setDetailService(null)}
          maxWidth="sm"
          fullWidth
          aria-labelledby="service-detail-title"
          PaperProps={{
            sx: { borderRadius: 3, overflow: 'hidden', boxShadow: theme.shadows[24] },
          }}
        >
          {detailService && (
            <>
              <DialogTitle
                id="service-detail-title"
                sx={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  p: 0,
                  m: -1,
                  overflow: 'hidden',
                  clip: 'rect(0,0,0,0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              >
                {detailService.name} — {detailService.code}
              </DialogTitle>
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={getCategoryImage(detailService.category || 'Other')}
                  alt={detailService.name}
                  sx={{ objectFit: 'cover' }}
                />
                <IconButton
                  aria-label="Close"
                  onClick={() => setDetailService(null)}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: alpha('#000', 0.5),
                    color: 'white',
                    '&:hover': { bgcolor: alpha('#000', 0.7) },
                  }}
                >
                  <CloseIcon />
                </IconButton>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                    background: `linear-gradient(transparent, ${alpha('#000', 0.7)})`,
                  }}
                >
                  <Typography variant="h5" fontWeight={700} color="white">
                    {detailService.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: alpha('#fff', 0.9) }}>
                    {detailService.category} · Code {detailService.code}
                  </Typography>
                </Box>
              </Box>
              <DialogContent sx={{ pt: 3 }}>
                {detailService.description && (
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {detailService.description}
                  </Typography>
                )}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {priceLabel(currency)}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main">
                    {formatPrice(detailService.price, currency)}
                  </Typography>
                  {detailService.turnaroundHours != null && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Typical turnaround: {detailService.turnaroundHours < 24
                        ? `${detailService.turnaroundHours} hour${detailService.turnaroundHours === 1 ? '' : 's'}`
                        : `${Math.ceil(detailService.turnaroundHours / 24)} business day(s)`}
                    </Typography>
                  )}
                </Paper>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setDetailService(null)}>Close</Button>
                <Button component={Link} to="/patient-portal" variant="contained">
                  Patient portal
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* About us */}
        <Box id="about" sx={{ mt: 10, mb: 6 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={2} sx={{ display: 'block', mb: 1.5 }}>
              Who we are
            </Typography>
            <Typography variant="h4" fontWeight={700} color="text.primary" gutterBottom sx={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '2rem' }}>
              About {labName}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640, mx: 'auto', whiteSpace: 'pre-line', lineHeight: 1.75 }}>
              {aboutText}
            </Typography>
          </Box>
          {accreditations.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5, mb: 4 }}>
              {accreditations.map((acc) => (
                <Paper
                  key={acc}
                  variant="outlined"
                  sx={{
                    px: 2.5,
                    py: 1.25,
                    borderRadius: 2,
                    fontWeight: 600,
                    color: 'primary.main',
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  }}
                >
                  {acc}
                </Paper>
              ))}
            </Box>
          )}
        </Box>

        {/* CTA */}
        <Paper
          elevation={0}
          sx={{
            mt: 10,
            p: { xs: 5, md: 7 },
            textAlign: 'center',
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.06)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 50%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            border: '1px solid',
            borderColor: alpha(theme.palette.primary.main, 0.18),
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.08)}`,
          }}
        >
          <Typography variant="h5" fontWeight={700} gutterBottom color="text.primary" sx={{ fontFamily: '"Cormorant Garamond", serif' }}>
            Ready to get started?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}>
            Staff: sign in to manage orders. Patients: use the patient portal to check your results securely.
          </Typography>
          <Button
            component={Link}
            to="/login"
            variant="contained"
            size="large"
            endIcon={<ArrowForwardIcon />}
            sx={{
              mr: 1.5,
              mb: { xs: 1, sm: 0 },
              px: 3.5,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              '&:hover': { transform: 'translateY(-1px)' },
              transition: 'transform 0.2s ease',
            }}
          >
            Staff login
          </Button>
          <Button
            component={Link}
            to="/patient-portal"
            variant="outlined"
            size="large"
            sx={{ px: 3.5, py: 1.5, borderRadius: 2, fontWeight: 600 }}
          >
            Patient portal
          </Button>
        </Paper>
      </Container>

      {/* Footer – Contact */}
      <Box
        id="contact"
        component="footer"
        sx={{
          py: 6,
          px: 2,
          background: `linear-gradient(180deg, ${theme.palette.primary.dark} 0%, ${alpha(theme.palette.primary.dark, 0.98)} 100%)`,
          color: 'white',
          borderTop: `1px solid ${alpha('#fff', 0.08)}`,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="center" sx={{ mb: 4 }}>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: alpha('#fff', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <ContactMailIcon sx={{ fontSize: 28, opacity: 0.95 }} />
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1, fontFamily: '"Cormorant Garamond", serif' }}>
                  Contact {labName}
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#fff', 0.88), maxWidth: 520, lineHeight: 1.6 }}>
                  For test inquiries, bulk pricing, referring physician support, or patient results, use the details below or the patient portal.
                </Typography>
                {(contactPhone || contactEmail || contactAddress || businessHours) && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      gap: 2,
                      mt: 2,
                      pt: 2,
                      borderTop: `1px solid ${alpha('#fff', 0.12)}`,
                      width: '100%',
                      maxWidth: 560,
                    }}
                  >
                    {contactPhone && <Typography variant="body2" component="span" sx={{ color: alpha('#fff', 0.95) }}>Tel: {contactPhone}</Typography>}
                    {contactEmail && <Typography variant="body2" component="span" sx={{ color: alpha('#fff', 0.95) }}>Email: {contactEmail}</Typography>}
                    {contactAddress && <Typography variant="body2" component="span" sx={{ color: alpha('#fff', 0.95) }}>{contactAddress}</Typography>}
                    {businessHours && <Typography variant="body2" component="span" sx={{ color: alpha('#fff', 0.95) }}>Hours: {businessHours}</Typography>}
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
          <Typography variant="body2" sx={{ color: alpha('#fff', 0.75), textAlign: 'center' }}>
            © {labName} — Pathology Lab Information Management System
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
