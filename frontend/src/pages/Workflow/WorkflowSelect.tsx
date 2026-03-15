import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button, Grid } from '@mui/material';
import { workflowsApi } from '../../api/endpoints';

export default function WorkflowSelect() {
  const navigate = useNavigate();
  const { data: templates } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => workflowsApi.templates().then((r) => r.data),
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Workflow select
      </Typography>
      <Grid container spacing={2}>
        {(templates ?? []).map((t: { id: string; name: string; steps: string[] }) => (
          <Grid item xs={12} sm={6} md={4} key={t.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{t.name}</Typography>
                <Typography variant="body2" color="text.secondary">Steps: {t.steps.join(' → ')}</Typography>
                <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/workflow/execute/${t.id}`)}>Execute</Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
