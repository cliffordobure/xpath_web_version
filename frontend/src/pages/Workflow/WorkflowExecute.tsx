import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button, Stepper, Step, StepLabel } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { workflowsApi } from '../../api/endpoints';

export default function WorkflowExecute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: templates } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => workflowsApi.templates().then((r) => r.data),
  });
  const template = (templates ?? []).find((t: { id: string }) => t.id === id);

  if (!template) return <Box><Typography>Workflow not found.</Typography></Box>;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Execute: {template.name}
      </Typography>
      <Card>
        <CardContent>
          <Stepper activeStep={0} alternativeLabel>
            {template.steps.map((label: string) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
          <Button sx={{ mt: 2 }} onClick={() => navigate(`/workflow/complete/${id}`)}>Mark complete</Button>
        </CardContent>
      </Card>
    </Box>
  );
}
