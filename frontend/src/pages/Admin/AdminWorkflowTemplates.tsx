import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Alert,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { workflowsApi, settingsApi } from '../../api/endpoints';

const RECEPTIONIST_STEP_LABELS: Record<string, string> = {
  receive: 'Receive',
  payment: 'Payment',
  courier: 'Courier',
  assign: 'Assign technician',
  results: 'Results',
};

const DEFAULT_RECEPTIONIST_STEPS = ['receive', 'payment', 'courier', 'assign', 'results'];

export default function AdminWorkflowTemplates() {
  const queryClient = useQueryClient();
  const [receptionistSteps, setReceptionistSteps] = useState<string[]>(DEFAULT_RECEPTIONIST_STEPS);

  const { data: templates } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => workflowsApi.templates().then((r) => r.data),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  });

  useEffect(() => {
    const steps = settings?.receptionistWorkflowSteps;
    if (Array.isArray(steps) && steps.length > 0) {
      const valid = steps.filter((s) => RECEPTIONIST_STEP_LABELS[s]);
      if (valid.length > 0) setReceptionistSteps(valid);
    }
  }, [settings]);

  const saveReceptionistMutation = useMutation({
    mutationFn: (steps: string[]) => settingsApi.update({ receptionistWorkflowSteps: steps }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const moveStep = (index: number, dir: -1 | 1) => {
    const next = [...receptionistSteps];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setReceptionistSteps(next);
  };

  const handleSaveReceptionistOrder = () => {
    saveReceptionistMutation.mutate(receptionistSteps);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Workflow templates
      </Typography>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
        Lab processing workflows
      </Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <List>
            {(templates ?? []).map((t: { id: string; name: string; steps: string[] }) => (
              <ListItem key={t.id}>
                <ListItemText primary={t.name} secondary={t.steps.join(' → ')} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
        Receptionist workflow (order of steps)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configure which steps appear first in the receptionist workflow. This order is used when receptionists (and admins) process orders. Different labs can use a different order.
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <List dense>
            {receptionistSteps.map((stepId, index) => (
              <ListItem key={stepId}>
                <ListItemText
                  primary={RECEPTIONIST_STEP_LABELS[stepId] || stepId}
                  secondary={`Step ${index + 1}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={() => moveStep(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <ArrowUpwardIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => moveStep(index, 1)}
                    disabled={index === receptionistSteps.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDownwardIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          {saveReceptionistMutation.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>Receptionist workflow order saved.</Alert>
          )}
          {saveReceptionistMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {(saveReceptionistMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed'}
            </Alert>
          )}
          <Button
            variant="contained"
            startIcon={<PersonSearchIcon />}
            onClick={handleSaveReceptionistOrder}
            disabled={saveReceptionistMutation.isPending}
            sx={{ mt: 2 }}
          >
            Save receptionist workflow order
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
