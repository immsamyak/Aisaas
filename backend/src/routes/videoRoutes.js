import express from 'express';
import * as videoController from '../controllers/videoController.js';

const router = express.Router();

// Video generation routes
router.post('/generate', videoController.generateVideo);
router.get('/job/:id', videoController.getJobStatus);
router.get('/video/:id', videoController.getVideoUrl);
router.get('/jobs', videoController.listJobs);
router.delete('/job/:id', videoController.deleteJob);

// Health check for specific service
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'video-api',
    timestamp: new Date().toISOString()
  });
});

export default router;
