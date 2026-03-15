import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button } from '@mui/material';

export default function WorkflowComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Workflow complete
      </Typography>
      <Card>
        <CardContent>
          <Typography>Workflow {id} completion confirmation. In production this would update order/sample status.</Typography>
          <Button sx={{ mt: 2 }} onClick={() => navigate('/workflow/select')}>Back to workflows</Button>
        </CardContent>
      </Card>
    </Box>
  );
}
