import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { Logo } from '../Logo';
import { useAuthStore } from '../../stores/authStore';
import { useLocaleStore } from '../../stores/localeStore';
import { t } from '../../i18n/translations';
import { navConfig } from './navConfig';

const DRAWER_WIDTH = 260;

export function AppLayout() {
  const [open, setOpen] = useState(true);
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const { locale } = useLocaleStore();
  const config = navConfig(user?.role);
  const getLabel = (item: { labelKey?: string; label: string }) => (item.labelKey ? t(locale, item.labelKey) : item.label);

  const drawer = (
    <Box sx={{ pt: 2, pb: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo height={36} />
        {!isSmall && (
          <IconButton onClick={() => setOpen(false)} size="small">
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: 1.5, pt: 1 }} disablePadding>
        {config.main.map((item) => {
          const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                pl: 2,
                py: 1.25,
                borderLeft: '3px solid',
                borderLeftColor: active ? 'primary.main' : 'transparent',
                bgcolor: active ? 'action.selected' : 'transparent',
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  '&:hover': { bgcolor: 'action.hover' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={getLabel(item)} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: active ? 600 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>
      {config.admin.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" sx={{ px: 2, color: 'text.secondary' }}>{t(locale, 'admin.administration')}</Typography>
          <List sx={{ px: 1.5 }} disablePadding>
            {config.admin.map((item) => {
              const active = location.pathname === item.path;
              return (
                <ListItemButton
                  key={item.path}
                  selected={active}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    pl: 2,
                    py: 1.25,
                    borderLeft: '3px solid',
                    borderLeftColor: active ? 'primary.main' : 'transparent',
                    bgcolor: active ? 'action.selected' : 'transparent',
                    '&.Mui-selected': { bgcolor: 'action.selected', '&:hover': { bgcolor: 'action.hover' } },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={getLabel(item)} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: active ? 600 : 400 }} />
                </ListItemButton>
              );
            })}
          </List>
        </>
      )}
      <Divider />
      <List sx={{ px: 1.5 }} disablePadding>
        <ListItemButton onClick={() => navigate('/settings')} sx={{ borderRadius: 2, pl: 2, py: 1.25 }}>
          <ListItemIcon sx={{ minWidth: 40 }}><SettingsIcon /></ListItemIcon>
          <ListItemText primary={t(locale, 'nav.settings')} primaryTypographyProps={{ fontSize: '0.9rem' }} />
        </ListItemButton>
        <ListItemButton
          onClick={() => { clearAuth(); navigate('/login'); }}
          sx={{ borderRadius: 2, pl: 2, py: 1.25, color: 'error.main' }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary={t(locale, 'nav.signOut')} primaryTypographyProps={{ fontSize: '0.9rem' }} />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setOpen(!open)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', height: 40 }}>
            <Logo height={32} sx={{ filter: 'brightness(0) invert(1)' }} />
          </Box>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {user?.name} ({user?.role})
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={isSmall ? 'temporary' : 'persistent'}
        open={isSmall ? open : true}
        onClose={() => setOpen(false)}
        sx={{
          width: open ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: 64,
            height: 'calc(100% - 64px)',
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: theme.transitions.create('width', { easing: theme.transitions.easing.sharp, duration: theme.transitions.duration.enteringScreen }),
            overflowX: 'hidden',
          },
        }}
      >
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 10, width: '100%', maxWidth: '100%' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
