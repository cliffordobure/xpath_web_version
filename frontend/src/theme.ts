import { createTheme, alpha } from '@mui/material/styles';

const primary = {
  main: '#0d47a1',
  light: '#5472d3',
  dark: '#002171',
};
const secondary = {
  main: '#00695c',
  light: '#439889',
  dark: '#003d33',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary,
    secondary,
    background: {
      default: '#f0f2f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"DM Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
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
          boxShadow: '0 2px 8px ' + alpha('#000', 0.06) + ', 0 1px 2px ' + alpha('#000', 0.04),
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 24px ' + alpha('#000', 0.08) + ', 0 2px 4px ' + alpha('#000', 0.04),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px ' + alpha('#000', 0.06) + ', 0 1px 2px ' + alpha('#000', 0.04),
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
