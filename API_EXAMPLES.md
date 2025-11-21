# API Examples

Collection of API usage examples for the AI Shorts Video Generator.

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

Currently no authentication required. In production, add JWT tokens.

---

## 1. Generate Video

Create a new video generation job.

### Request

```http
POST /api/generate
Content-Type: application/json

{
  "text": "The sun rises over the mountains. Birds begin their morning songs. A new day is born. Nature awakens with vibrant energy.",
  "voiceId": "default",
  "imageStyle": "cinematic",
  "musicEnabled": true,
  "subtitlesEnabled": true
}
```

### Response

```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Video generation started",
  "estimatedTime": "2-5 minutes"
}
```

### cURL Example

```bash
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Amazing story here...",
    "voiceId": "male",
    "imageStyle": "realistic",
    "musicEnabled": true,
    "subtitlesEnabled": true
  }'
```

### JavaScript Example

```javascript
const response = await fetch('http://localhost:5000/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Your text here...',
    voiceId: 'default',
    imageStyle: 'cinematic',
    musicEnabled: true,
    subtitlesEnabled: true
  })
});

const data = await response.json();
console.log('Job ID:', data.jobId);
```

### Python Example

```python
import requests

url = "http://localhost:5000/api/generate"
payload = {
    "text": "Your text here...",
    "voiceId": "default",
    "imageStyle": "realistic",
    "musicEnabled": True,
    "subtitlesEnabled": True
}

response = requests.post(url, json=payload)
data = response.json()
print(f"Job ID: {data['jobId']}")
```

---

## 2. Get Job Status

Check the status and progress of a video generation job.

### Request

```http
GET /api/job/{jobId}
```

### Response - Processing

```json
{
  "success": true,
  "job": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "progress": 65,
    "currentStep": "Rendering video",
    "videoUrl": null,
    "thumbnailUrl": null,
    "duration": 0,
    "error": null,
    "metadata": {
      "totalScenes": 4
    },
    "settings": {
      "voiceId": "default",
      "imageStyle": "cinematic",
      "musicEnabled": true,
      "subtitlesEnabled": true
    },
    "createdAt": "2025-11-21T10:30:00.000Z",
    "completedAt": null,
    "processingTime": 0
  }
}
```

### Response - Completed

```json
{
  "success": true,
  "job": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "progress": 100,
    "currentStep": "Finalizing",
    "videoUrl": "https://your-space.digitaloceanspaces.com/videos/550e8400.../final.mp4",
    "thumbnailUrl": "https://your-space.digitaloceanspaces.com/videos/550e8400.../thumb.jpg",
    "duration": 45.5,
    "error": null,
    "metadata": {
      "duration": 45.5,
      "fileSize": 12582912,
      "resolution": "1080x1920",
      "totalScenes": 4
    },
    "createdAt": "2025-11-21T10:30:00.000Z",
    "completedAt": "2025-11-21T10:33:15.000Z",
    "processingTime": 195
  }
}
```

### cURL Example

```bash
curl http://localhost:5000/api/job/550e8400-e29b-41d4-a716-446655440000
```

### JavaScript Polling Example

```javascript
async function pollJobStatus(jobId) {
  const checkStatus = async () => {
    const response = await fetch(`http://localhost:5000/api/job/${jobId}`);
    const data = await response.json();
    
    console.log(`Status: ${data.job.status}, Progress: ${data.job.progress}%`);
    
    if (data.job.status === 'completed') {
      console.log('Video URL:', data.job.videoUrl);
      return data.job;
    } else if (data.job.status === 'failed') {
      console.error('Error:', data.job.error);
      return null;
    } else {
      // Check again in 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      return checkStatus();
    }
  };
  
  return checkStatus();
}

// Usage
const job = await pollJobStatus('550e8400-e29b-41d4-a716-446655440000');
```

---

## 3. Get Video URL

Get the final video download URL (only for completed jobs).

### Request

```http
GET /api/video/{jobId}
```

### Response

```json
{
  "success": true,
  "video": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "videoUrl": "https://your-space.digitaloceanspaces.com/videos/550e8400.../final.mp4",
    "thumbnailUrl": "https://your-space.digitaloceanspaces.com/videos/550e8400.../thumb.jpg",
    "duration": 45.5,
    "fileSize": 12582912,
    "resolution": "1080x1920",
    "createdAt": "2025-11-21T10:30:00.000Z"
  }
}
```

### cURL Example

```bash
curl http://localhost:5000/api/video/550e8400-e29b-41d4-a716-446655440000
```

### Download Video Example

```javascript
async function downloadVideo(jobId) {
  const response = await fetch(`http://localhost:5000/api/video/${jobId}`);
  const data = await response.json();
  
  if (data.success) {
    // Download the video
    window.open(data.video.videoUrl, '_blank');
  }
}
```

---

## 4. List All Jobs

Get a list of all video generation jobs.

### Request

```http
GET /api/jobs?page=1&limit=20&status=completed
```

### Query Parameters

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (pending, processing, completed, failed)

### Response

```json
{
  "success": true,
  "jobs": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "progress": 100,
      "currentStep": "Finalizing",
      "videoUrl": "https://...",
      "thumbnailUrl": "https://...",
      "createdAt": "2025-11-21T10:30:00.000Z",
      "completedAt": "2025-11-21T10:33:15.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### cURL Example

```bash
curl "http://localhost:5000/api/jobs?page=1&limit=10&status=completed"
```

---

## 5. Delete Job

Delete a job and its associated video.

### Request

```http
DELETE /api/job/{jobId}
```

### Response

```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

### cURL Example

```bash
curl -X DELETE http://localhost:5000/api/job/550e8400-e29b-41d4-a716-446655440000
```

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Validation failed",
  "details": "text must be at least 10 characters"
}
```

### 404 Not Found

```json
{
  "error": "Job not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to start video generation",
  "message": "Redis connection error"
}
```

---

## Complete Workflow Example

```javascript
async function generateAndWaitForVideo(text) {
  // 1. Generate video
  const generateResponse = await fetch('http://localhost:5000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voiceId: 'default',
      imageStyle: 'cinematic',
      musicEnabled: true,
      subtitlesEnabled: true
    })
  });
  
  const { jobId } = await generateResponse.json();
  console.log('Job created:', jobId);
  
  // 2. Poll for completion
  let completed = false;
  while (!completed) {
    const statusResponse = await fetch(`http://localhost:5000/api/job/${jobId}`);
    const { job } = await statusResponse.json();
    
    console.log(`Progress: ${job.progress}% - ${job.currentStep}`);
    
    if (job.status === 'completed') {
      completed = true;
      console.log('Video ready:', job.videoUrl);
      return job;
    } else if (job.status === 'failed') {
      throw new Error(job.error);
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Usage
const job = await generateAndWaitForVideo('Your amazing story here...');
```

---

## Rate Limiting

Currently no rate limiting. In production, implement:

- 10 requests per minute per IP
- 100 videos per day per user
- Queue limit: 1000 pending jobs

---

## Best Practices

1. **Poll Responsibly**: Don't poll more than once every 2 seconds
2. **Handle Errors**: Always check for error responses
3. **Validate Input**: Ensure text is 10-5000 characters
4. **Use Webhooks**: In production, implement webhooks instead of polling
5. **Cache Responses**: Cache completed job data
6. **Cleanup**: Delete old jobs to free up storage

---

## SDKs and Integrations

### Node.js Client

```javascript
class VideoGeneratorClient {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
  }

  async generate(options) {
    const response = await fetch(`${this.apiUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    return response.json();
  }

  async getStatus(jobId) {
    const response = await fetch(`${this.apiUrl}/job/${jobId}`);
    return response.json();
  }

  async waitForCompletion(jobId) {
    while (true) {
      const { job } = await this.getStatus(jobId);
      if (job.status === 'completed') return job;
      if (job.status === 'failed') throw new Error(job.error);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Usage
const client = new VideoGeneratorClient('http://localhost:5000/api');
const { jobId } = await client.generate({ text: 'Story...' });
const job = await client.waitForCompletion(jobId);
```

For more examples and integration guides, check the documentation.
