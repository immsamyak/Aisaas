export default {
  apps: [
    {
      name: 'ai-shorts-worker',
      script: './processor.js',
      instances: 2, // Run 2 workers for parallel processing
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      kill_timeout: 30000 // Allow 30 seconds for graceful shutdown
    }
  ]
};
