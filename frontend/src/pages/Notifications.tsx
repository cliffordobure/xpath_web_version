import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, IconButton, Link } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { notificationsApi, type NotificationItem } from '../api/endpoints';
import { Link as RouterLink } from 'react-router-dom';

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ limit: 50 }),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Notifications
      </Typography>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <NotificationsIcon color="primary" />
            <Typography variant="subtitle1">Recent notifications</Typography>
          </Box>
          {isLoading ? (
            <Typography color="text.secondary">Loading…</Typography>
          ) : items.length === 0 ? (
            <Typography color="text.secondary">No notifications yet.</Typography>
          ) : (
            <List dense>
              {items.map((item: NotificationItem) => (
                <ListItem
                  key={item._id}
                  secondaryAction={
                    !item.readAt && (
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label="Mark read"
                        onClick={() => markRead.mutate(item._id)}
                      >
                        <DoneAllIcon fontSize="small" />
                      </IconButton>
                    )
                  }
                  sx={{ bgcolor: item.readAt ? undefined : 'action.hover' }}
                >
                  <ListItemText
                    primary={
                      item.orderId ? (
                        <Link component={RouterLink} to={`/orders/${item.orderId}`} underline="hover">
                          {item.title}
                        </Link>
                      ) : (
                        item.title
                      )
                    }
                    secondary={item.body}
                    primaryTypographyProps={{ fontWeight: item.readAt ? 400 : 600 }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
