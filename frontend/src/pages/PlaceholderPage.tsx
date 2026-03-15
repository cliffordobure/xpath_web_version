import { Box, Typography, Card, CardContent } from '@mui/material';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>{title}</Typography>
      <Card>
        <CardContent>
          <Typography color="text.secondary">This module is available in the full desktop application. Web implementation can be added in a later phase.</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
