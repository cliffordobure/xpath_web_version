import { createTheme, alpha } from '@mui/material/styles';

const primary = {
  main: '#1565c0',
  light: '#5e92f3',
  dark: '#003c8f',
};
const secondary = {
  main: '#00897b',
  light: '#4ebaaa',
  dark: '#005b4f',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary,
    secondary,
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
    success: { main: '#2e7d32', light: alpha('#2e7d32', 0.12) },
    warning: { main: '#ed6c02', light: alpha('#ed6c02', 0.12) },
    info: { main: '#0288d1', light: alpha('#0288d1', 0.12) },
  },
  typography: {
    fontFamily: '"DM Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 2px ' + alpha('#000', 0.04),
    '0 2px 8px ' + alpha('#000', 0.06),
    '0 4px 12px ' + alpha('#000', 0.06),
    '0 8px 24px ' + alpha('#000', 0.08),
    '0 12px 32px ' + alpha('#000', 0.08),
    '0 16px 40px ' + alpha('#000', 0.08),
    '0 20px 48px ' + alpha('#000', 0.1),
    '0 24px 56px ' + alpha('#000', 0.1),
    '0 28px 64px ' + alpha('#000', 0.1),
    '0 32px 72px ' + alpha('#000', 0.12),
    '0 36px 80px ' + alpha('#000', 0.12),
    '0 40px 88px ' + alpha('#000', 0.12),
    '0 44px 96px ' + alpha('#000', 0.12),
    '0 48px 104px ' + alpha('#000', 0.14),
    '0 52px 112px ' + alpha('#000', 0.14),
    '0 56px 120px ' + alpha('#000', 0.14),
    '0 60px 128px ' + alpha('#000', 0.14),
    '0 64px 136px ' + alpha('#000', 0.16),
    '0 68px 144px ' + alpha('#000', 0.16),
    '0 72px 152px ' + alpha('#000', 0.16),
    '0 76px 160px ' + alpha('#000', 0.16),
    '0 80px 168px ' + alpha('#000', 0.18),
    '0 84px 176px ' + alpha('#000', 0.18),
    '0 88px 184px ' + alpha('#000', 0.18),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid ' + alpha('#000', 0.06),
          boxShadow: '0 2px 8px ' + alpha('#000', 0.04),
          transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 24px ' + alpha('#000', 0.08),
            borderColor: alpha(primary.main, 0.15),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid ' + alpha('#000', 0.06),
          boxShadow: '0 2px 8px ' + alpha('#000', 0.04),
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px ' + alpha('#000', 0.08),
        },
      },
    },
  },
});
