'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Video, CheckCircle, Clock, AlertCircle, Download, ArrowLeft } from 'lucide-react';
import { videoAPI } from '../../../libs/api';
import LoadingUI from '../../../components/LoadingUI';
import VideoCard from '../../../components/VideoCard';

export default function VideoPage({ params }) {
  const { id } = params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchJobStatus = async () => {
      try {
        const response = await videoAPI.getJobStatus(id);
        setJob(response.job);

        // If still processing, poll again
        if (response.job.status === 'pending' || response.job.status === 'processing') {
          setTimeout(fetchJobStatus, 2000); // Poll every 2 seconds
        }
      } catch (error) {
        console.error('Error fetching job status:', error);
        setError(error.response?.data?.error || 'Failed to fetch job status');
      } finally {
        setLoading(false);
      }
    };

    fetchJobStatus();
  }, [id]);

  if (loading) {
    return <LoadingUI message="Loading video status..." />;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Create New Video
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Video className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold">AI Shorts Generator</span>
            </Link>
            <Link
              href="/create"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Another
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Status Header */}
          <div className="text-center mb-8">
            {job.status === 'pending' && (
              <>
                <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4 animate-pulse" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Queued
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Your video is in the queue...
                </p>
              </>
            )}

            {job.status === 'processing' && (
              <>
                <div className="w-16 h-16 mx-auto mb-4">
                  <div className="w-full h-full border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Processing
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {job.currentStep || 'Generating your video...'}
                </p>
              </>
            )}

            {job.status === 'completed' && (
              <>
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Completed!
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Your video is ready
                </p>
              </>
            )}

            {job.status === 'failed' && (
              <>
                <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Failed
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  {job.error || 'An error occurred during processing'}
                </p>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {(job.status === 'pending' || job.status === 'processing') && (
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span>{job.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Video Player */}
          {job.status === 'completed' && job.videoUrl && (
            <VideoCard
              videoUrl={job.videoUrl}
              thumbnailUrl={job.thumbnailUrl}
              duration={job.metadata?.duration}
              fileSize={job.metadata?.fileSize}
            />
          )}

          {/* Job Details */}
          <div className="mt-8 border-t dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Job Details
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">Job ID</dt>
                <dd className="text-sm font-mono text-gray-900 dark:text-white">{job.jobId}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">Status</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {job.status}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 dark:text-gray-400">Created At</dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {new Date(job.createdAt).toLocaleString()}
                </dd>
              </div>
              {job.completedAt && (
                <div>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Processing Time</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {job.processingTime}s
                  </dd>
                </div>
              )}
              {job.metadata?.totalScenes && (
                <div>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Scenes</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {job.metadata.totalScenes}
                  </dd>
                </div>
              )}
              {job.metadata?.resolution && (
                <div>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Resolution</dt>
                  <dd className="text-sm text-gray-900 dark:text-white">
                    {job.metadata.resolution}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions */}
          {job.status === 'completed' && (
            <div className="mt-8 flex gap-4">
              <a
                href={job.videoUrl}
                download
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Video
              </a>
              <Link
                href="/create"
                className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-center"
              >
                Create Another
              </Link>
            </div>
          )}

          {job.status === 'failed' && (
            <div className="mt-8">
              <Link
                href="/create"
                className="block w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              >
                Try Again
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
