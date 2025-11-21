'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Sparkles, ArrowLeft } from 'lucide-react';
import { videoAPI } from '../../libs/api';
import TextInput from '../../components/TextInput';
import LoadingUI from '../../components/LoadingUI';

export default function CreatePage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState('default');
  const [imageStyle, setImageStyle] = useState('realistic');
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');

    if (text.trim().length < 10) {
      setError('Please enter at least 10 characters');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await videoAPI.generateVideo({
        text,
        voiceId,
        imageStyle,
        musicEnabled,
        subtitlesEnabled,
      });

      // Redirect to job status page
      router.push(`/video/${response.jobId}`);
    } catch (error) {
      console.error('Generation error:', error);
      setError(error.response?.data?.error || 'Failed to start video generation');
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return <LoadingUI message="Starting video generation..." />;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-5 h-5" />
              <Video className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold">AI Shorts Generator</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Create Your Video
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Enter your text and customize your video settings
          </p>
        </div>

        <form onSubmit={handleGenerate} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Text Input */}
          <TextInput
            value={text}
            onChange={setText}
            placeholder="Enter your text here... (e.g., 'The ocean is vast and mysterious. Its depths hold countless secrets. Marine life thrives in the coral reefs.')"
          />

          {/* Voice Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Voice
            </label>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="default">Default (Female)</option>
              <option value="male">Male Voice</option>
              <option value="female">Female Voice</option>
              <option value="british">British Accent</option>
            </select>
          </div>

          {/* Style Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Image Style
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { value: 'realistic', label: 'Realistic' },
                { value: 'cinematic', label: 'Cinematic' },
                { value: 'anime', label: 'Anime' },
                { value: 'digital_art', label: 'Digital Art' },
                { value: 'oil_painting', label: 'Oil Painting' },
                { value: 'cartoon', label: 'Cartoon' },
              ].map((style) => (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => setImageStyle(style.value)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    imageStyle === style.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="mb-6 space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={musicEnabled}
                onChange={(e) => setMusicEnabled(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Add background music</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={subtitlesEnabled}
                onChange={(e) => setSubtitlesEnabled(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Add subtitles</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isGenerating || text.trim().length < 10}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            Generate Video
          </button>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
            Estimated time: 2-5 minutes
          </p>
        </form>
      </section>
    </main>
  );
}
