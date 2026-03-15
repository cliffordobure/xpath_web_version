import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, TextField } from '@mui/material';

const SIM_DURATION_SEC = 4 * 60;
const SAVE_IMAGES_DELAY_MS = 2500;

export default function DigitalPathology() {
  const [stainedSampleId, setStainedSampleId] = useState('');
  const [simRunning, setSimRunning] = useState(false);
  const [simSecondsLeft, setSimSecondsLeft] = useState(0);
  const [simComplete, setSimComplete] = useState(false);
  const [savingImages, setSavingImages] = useState(false);
  const [imagesSaved, setImagesSaved] = useState(false);

  useEffect(() => {
    if (!simRunning || simSecondsLeft <= 0) return;
    const t = setInterval(() => {
      setSimSecondsLeft((s) => {
        if (s <= 1) {
          setSimRunning(false);
          setSimComplete(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [simRunning, simSecondsLeft]);

  useEffect(() => {
    if (!simComplete || savingImages || imagesSaved) return;
    setSavingImages(true);
    const t = setTimeout(() => {
      setSavingImages(false);
      setImagesSaved(true);
    }, SAVE_IMAGES_DELAY_MS);
    return () => clearTimeout(t);
  }, [simComplete, savingImages, imagesSaved]);

  const progressPercent =
    SIM_DURATION_SEC > 0 ? ((SIM_DURATION_SEC - simSecondsLeft) / SIM_DURATION_SEC) * 100 : 0;
  const canStart = !simRunning && simSecondsLeft === 0 && !simComplete && stainedSampleId.trim().length > 0;

  const handleReset = () => {
    setSimComplete(false);
    setImagesSaved(false);
    setSavingImages(false);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
        Digital pathology
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter the stained sample (Slide ID), then run the simulation. When it finishes, images are saved to the server for that sample.
      </Typography>

      <Card sx={{ maxWidth: 520 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Stained sample ID (required)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the Slide ID of the stained sample (e.g. from Histology → Staining). Slide IDs look like AccessionId-BLK-001-SLD-001.
          </Typography>
          <TextField
            fullWidth
            label="Stained sample ID / Slide ID"
            placeholder="e.g. XP-26-139710-BLK-001-SLD-001"
            value={stainedSampleId}
            onChange={(e) => setStainedSampleId(e.target.value)}
            disabled={simRunning || savingImages || imagesSaved}
            sx={{ mb: 3 }}
            inputProps={{ autoComplete: 'off' }}
          />

          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Simulate processing (4 min)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            With the sample ID above, start the simulation. A circular timer runs like a watch until the end; then slide images are saved to the server for this sample.
          </Typography>

          {canStart && !imagesSaved && (
            <Button
              variant="contained"
              onClick={() => {
                handleReset();
                setSimRunning(true);
                setSimSecondsLeft(SIM_DURATION_SEC);
              }}
            >
              Start simulation (4 min)
            </Button>
          )}

          {(simRunning || (simComplete && !savingImages)) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={progressPercent}
                  size={160}
                  thickness={4}
                  sx={{ transform: 'rotate(-90deg)' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4" component="span" fontWeight={700}>
                    {Math.floor(simSecondsLeft / 60)}:{String(simSecondsLeft % 60).padStart(2, '0')}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                {simRunning ? 'Processing…' : 'Complete'}
              </Typography>
              {stainedSampleId.trim() && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }} component="span" display="block">
                  Sample: {stainedSampleId.trim()}
                </Typography>
              )}
            </Box>
          )}

          {savingImages && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={28} />
                <Typography variant="body1">Saving images to server…</Typography>
              </Box>
              {stainedSampleId.trim() && (
                <Typography variant="caption" color="text.secondary">Sample: {stainedSampleId.trim()}</Typography>
              )}
            </Box>
          )}

          {imagesSaved && (
            <Alert severity="success" sx={{ mt: 2 }} onClose={handleReset}>
              <Typography variant="subtitle2" fontWeight={600}>Simulation complete</Typography>
              {stainedSampleId.trim() && (
                <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>Sample: {stainedSampleId.trim()}</Typography>
              )}
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Processing finished and images have been saved to the server for this sample. Pathologists can view them when the order is assigned. You can run the simulation again with another Slide ID or go to Histology.
              </Typography>
              <Button size="small" onClick={handleReset} sx={{ mt: 1 }}>
                Run again
              </Button>
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
