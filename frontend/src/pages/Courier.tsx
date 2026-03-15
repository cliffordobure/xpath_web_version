import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Badge,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PhoneIcon from '@mui/icons-material/Phone';
import MapIcon from '@mui/icons-material/Map';
import { QRCodeSVG } from 'qrcode.react';
import { ordersApi } from '../api/endpoints';
import { useAuthStore } from '../stores/authStore';
import type { Order } from '../api/endpoints';

const COURIER_STATUS_LABELS: Record<string, string> = {
  ready_for_pickup: 'Ready for pickup',
  on_way_to_pickup: 'On the way for pickup',
  at_site_for_pickup: 'At site for pickup',
  picked_up_on_way_to_lab: 'Picked up, on the way to lab',
  in_transit: 'In transit',
  received_at_lab: 'Received at lab',
};

function patientLabel(o: Order): string {
  const p = typeof o.patient === 'object' ? o.patient : null;
  return p ? `${p.firstName} ${p.lastName}` : '—';
}

function patientPhone(o: Order): string {
  const p = typeof o.patient === 'object' ? o.patient : null;
  return (p && p.phone && String(p.phone).trim()) || '—';
}

function pickupAddressLabel(o: Order): string {
  return (o.pickupPlaceName && o.pickupPlaceName.trim()) || (o.pickupAddress && o.pickupAddress.trim()) || (typeof o.patient === 'object' && o.patient?.address) || '—';
}

function pickupMapsUrl(o: Order): string | null {
  if (o.pickupLat != null && o.pickupLng != null) {
    return `https://www.google.com/maps?q=${o.pickupLat},${o.pickupLng}`;
  }
  return null;
}

/** QR payload for sample/order chain of custody - scan to identify order */
function qrPayload(order: Order): string {
  return `LIMS:${order.orderNumber}:${order._id}`;
}

export default function Courier() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isCourier = user?.role === 'courier';

  const { data: pickupRequestsData } = useQuery({
    queryKey: ['orders', 'pickupRequests'],
    queryFn: () => ordersApi.list({ pickupRequests: 'true', limit: 50 }).then((r) => r.data),
  });
  const { data: myPickupsData } = useQuery({
    queryKey: ['orders', 'assignedToMeCourier'],
    queryFn: () => ordersApi.list({ assignedToMeCourier: true, limit: 50 }).then((r) => r.data),
    enabled: isCourier,
  });

  const { data: receivedData } = useQuery({
    queryKey: ['orders', 'status', 'received'],
    queryFn: () => ordersApi.list({ status: 'received', limit: 50 }).then((r) => r.data),
    enabled: !isCourier,
  });
  const { data: inProgressData } = useQuery({
    queryKey: ['orders', 'status', 'in_progress'],
    queryFn: () => ordersApi.list({ status: 'in_progress', limit: 50 }).then((r) => r.data),
    enabled: !isCourier,
  });
  const { data: queueData } = useQuery({
    queryKey: ['orders', 'courierQueue'],
    queryFn: () =>
      ordersApi
        .list({
          courierStatus: 'ready_for_pickup,on_way_to_pickup,at_site_for_pickup,picked_up_on_way_to_lab,in_transit,received_at_lab',
          limit: 100,
        })
        .then((r) => r.data),
    enabled: !isCourier,
  });

  const pickupRequests = pickupRequestsData?.data ?? [];
  const myPickups = myPickupsData?.data ?? [];
  const eligibleForCheckIn = [
    ...(receivedData?.data ?? []),
    ...(inProgressData?.data ?? []),
  ].filter((o) => !o.courierStatus || o.courierStatus === '');
  const queueOrders = queueData?.data ?? [];

  const updateOrder = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) => ordersApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const checkIn = (order: Order) => updateOrder.mutate({ id: order._id, data: { courierStatus: 'ready_for_pickup' } });
  const setCourierStatus = (order: Order, status: Order['courierStatus']) =>
    updateOrder.mutate({ id: order._id, data: { courierStatus: status } });
  const claimPickup = (order: Order) =>
    user?._id &&
    updateOrder.mutate({
      id: order._id,
      data: { assignedCourier: user._id, courierStatus: 'on_way_to_pickup' },
    });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h4" fontWeight={700}>
          Courier
        </Typography>
        {pickupRequests.length > 0 && (
          <Badge badgeContent={pickupRequests.length} color="error">
            <Chip
              icon={<NotificationsActiveIcon />}
              label={`${pickupRequests.length} pickup request${pickupRequests.length === 1 ? '' : 's'} — need courier`}
              color="error"
              variant="filled"
              size="medium"
            />
          </Badge>
        )}
      </Box>

      {/* Pickup requests: unassigned orders ready for pickup (online/referral). Couriers get alert and can claim. */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LocalShippingIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>
              Pickup requests
            </Typography>
            {pickupRequests.length > 0 && (
              <Chip size="small" label={pickupRequests.length} color="primary" />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Online orders that need a courier. When you claim one, you are assigned and can update status as you go: on the way → at site → picked up → received at lab.
          </Typography>
          {pickupRequests.length === 0 ? (
            <Typography color="text.secondary">No pickup requests right now. New online orders will appear here.</Typography>
          ) : (
            <List dense>
              {pickupRequests.map((o) => (
                <ListItem key={o._id} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <ListItemText
                    primary={o.orderNumber}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" display="block">
                          <strong>{patientLabel(o)}</strong>
                        </Typography>
                        {patientPhone(o) !== '—' && (
                          <Typography component="span" variant="body2" display="block">
                            <PhoneIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                            <a href={`tel:${patientPhone(o)}`} style={{ color: 'inherit' }}>{patientPhone(o)}</a>
                          </Typography>
                        )}
                        {pickupAddressLabel(o) !== '—' && (
                          <Typography component="span" variant="body2" display="block" color="text.secondary">
                            Pickup: {pickupAddressLabel(o)}
                          </Typography>
                        )}
                        {o.pickupLat != null && o.pickupLng != null && (
                          <Typography component="span" variant="caption" display="block" color="text.secondary">
                            Coords: {o.pickupLat.toFixed(5)}, {o.pickupLng.toFixed(5)}
                          </Typography>
                        )}
                        {pickupMapsUrl(o) && (
                          <Button
                            size="small"
                            startIcon={<MapIcon />}
                            href={pickupMapsUrl(o)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ mt: 0.5 }}
                          >
                            Open in Maps
                          </Button>
                        )}
                      </>
                    }
                  />
                  <ListItemSecondaryAction sx={{ position: 'relative' }}>
                    {isCourier ? (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => claimPickup(o)}
                        disabled={updateOrder.isPending}
                      >
                        Claim pickup
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary">Courier can claim</Typography>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* My pickups (courier only): orders I claimed, not yet received at lab */}
      {isCourier && myPickups.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocalShippingIcon color="secondary" />
              <Typography variant="subtitle1" fontWeight={600}>
                My pickups
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {myPickups.map((o) => (
                <Grid item xs={12} sm={6} md={4} key={o._id}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography fontWeight={600}>{o.orderNumber}</Typography>
                    <Typography variant="body2"><strong>{patientLabel(o)}</strong></Typography>
                    {patientPhone(o) !== '—' && (
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneIcon fontSize="small" />
                        <a href={`tel:${patientPhone(o)}`}>{patientPhone(o)}</a>
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block">Pickup: {pickupAddressLabel(o)}</Typography>
                    {o.pickupLat != null && o.pickupLng != null && (
                      <Typography variant="caption" color="text.secondary" display="block">Coords: {o.pickupLat.toFixed(5)}, {o.pickupLng.toFixed(5)}</Typography>
                    )}
                    {pickupMapsUrl(o) && (
                      <Button size="small" startIcon={<MapIcon />} href={pickupMapsUrl(o)!} target="_blank" rel="noopener noreferrer" sx={{ mt: 0.5 }}>
                        Open in Maps
                      </Button>
                    )}
                    <Chip label={COURIER_STATUS_LABELS[o.courierStatus || ''] || o.courierStatus} size="small" sx={{ mt: 0.5 }} color={o.courierStatus === 'received_at_lab' ? 'success' : 'default'} />
                    <Box sx={{ bgcolor: 'grey.50', p: 1, borderRadius: 1, mt: 1, display: 'inline-block' }}>
                      <QRCodeSVG value={qrPayload(o)} size={64} level="M" />
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    {o.courierStatus !== 'received_at_lab' && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {o.courierStatus === 'ready_for_pickup' && (
                          <Button size="small" variant="outlined" onClick={() => setCourierStatus(o, 'on_way_to_pickup')} disabled={updateOrder.isPending}>
                            On the way for pickup
                          </Button>
                        )}
                        {o.courierStatus === 'on_way_to_pickup' && (
                          <Button size="small" variant="outlined" onClick={() => setCourierStatus(o, 'at_site_for_pickup')} disabled={updateOrder.isPending}>
                            At site for pickup
                          </Button>
                        )}
                        {(o.courierStatus === 'at_site_for_pickup' || o.courierStatus === 'on_way_to_pickup') && (
                          <Button size="small" variant="outlined" onClick={() => setCourierStatus(o, 'picked_up_on_way_to_lab')} disabled={updateOrder.isPending}>
                            Picked up, on the way to lab
                          </Button>
                        )}
                        {['ready_for_pickup', 'on_way_to_pickup', 'at_site_for_pickup', 'picked_up_on_way_to_lab', 'in_transit'].includes(o.courierStatus || '') && (
                          <Button size="small" variant="contained" startIcon={<LocalHospitalIcon />} onClick={() => setCourierStatus(o, 'received_at_lab')} disabled={updateOrder.isPending}>
                            Received at lab
                          </Button>
                        )}
                      </Box>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Orders to check in for courier (receptionist/admin only — courier does not see this) */}
      {!isCourier && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LocalShippingIcon color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Check in orders for courier pickup (optional)
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              When payment is completed: <strong>referral orders</strong> (with a referring doctor/clinic) are automatically added to the courier queue below; <strong>walk-in</strong> orders are marked ready in the lab. Use this section only to manually add an order to the courier queue if needed.
            </Typography>
            {eligibleForCheckIn.length === 0 ? (
              <Typography color="text.secondary">No orders available to check in. Orders with status &quot;Received&quot; or &quot;In progress&quot; (and not yet in courier flow) appear here.</Typography>
            ) : (
              <List dense>
                {eligibleForCheckIn.map((o) => (
                  <ListItem key={o._id}>
                    <ListItemText primary={o.orderNumber} secondary={patientLabel(o)} />
                    <ListItemSecondaryAction>
                      <Button variant="contained" size="small" startIcon={<CheckCircleIcon />} onClick={() => checkIn(o)} disabled={updateOrder.isPending}>
                        Check in for courier
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* Courier queue: all orders in courier flow — receptionist/admin can follow progress */}
      {!isCourier && (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LocalShippingIcon color="action" />
            <Typography variant="subtitle1" fontWeight={600}>
              Courier queue — track all pickups and deliveries
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Follow courier progress: on the way for pickup → at site → picked up → received at lab.
          </Typography>
          {queueOrders.length === 0 ? (
            <Typography color="text.secondary">No orders in courier queue. Check in orders above to add them here.</Typography>
          ) : (
            <Grid container spacing={3}>
              {queueOrders.map((o) => (
                <Grid item xs={12} sm={6} md={4} key={o._id}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                      <Box>
                        <Typography fontWeight={600}>{o.orderNumber}</Typography>
                        <Typography variant="body2">{patientLabel(o)}</Typography>
                        {patientPhone(o) !== '—' && (
                          <Typography variant="caption" display="block">
                            <a href={`tel:${patientPhone(o)}`}>{patientPhone(o)}</a>
                          </Typography>
                        )}
                        {pickupAddressLabel(o) !== '—' && (
                          <Typography variant="caption" color="text.secondary" display="block">Pickup: {pickupAddressLabel(o)}</Typography>
                        )}
                        {pickupMapsUrl(o) && (
                          <Button size="small" startIcon={<MapIcon />} href={pickupMapsUrl(o)!} target="_blank" rel="noopener noreferrer" sx={{ p: 0, minWidth: 0, mt: 0.25 }}>
                            Maps
                          </Button>
                        )}
                        {o.assignedCourier && typeof o.assignedCourier === 'object' && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Courier: {o.assignedCourier.name}
                          </Typography>
                        )}
                        <Chip label={COURIER_STATUS_LABELS[o.courierStatus || ''] || o.courierStatus} size="small" sx={{ mt: 0.5 }} color={o.courierStatus === 'received_at_lab' ? 'success' : 'default'} />
                      </Box>
                      <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <QRCodeSVG value={qrPayload(o)} size={80} level="M" />
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Sample QR — scan for chain of custody
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>
      )}
    </Box>
  );
}
