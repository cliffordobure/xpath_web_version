import { Box, Typography, Card, CardContent } from '@mui/material';

export default function ReportsManagement() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Reports management
      </Typography>
      <Card>
        <CardContent>
          <Typography color="text.secondary">Configure report templates and output settings. Available in admin scope.</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
