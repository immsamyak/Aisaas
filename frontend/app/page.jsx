import Link from 'next/link';
import { Video, Sparkles, Clock, Download } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Video className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold">AI Shorts Generator</span>
            </div>
            <Link
              href="/create"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Video
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Turn Text into
            <span className="text-blue-600"> AI-Powered Videos</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Generate stunning 1080x1920 short videos with AI-generated images, voiceovers, 
            and background music in minutes.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/create"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Start Creating
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-lg"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Demo Video */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <Video className="w-24 h-24 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Demo video coming soon</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white dark:bg-gray-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need to create professional short videos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Image Generation</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Generate stunning images for each scene using Stable Diffusion AI with multiple style options.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">High-Quality TTS</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Natural-sounding voiceovers using ElevenLabs or Bark AI with multiple voice options.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Fast Processing</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Generate complete videos in 2-5 minutes with our optimized rendering pipeline.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Auto Subtitles</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Automatically generated subtitles perfectly synced with your voiceover.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
              <div className="w-12 h-12 bg-cyan-600 rounded-lg flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Background Music</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Copyright-free background music automatically mixed at the perfect volume.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Cloud Storage</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Videos stored securely in DigitalOcean Spaces with instant download links.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Simple Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Choose the plan that fits your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-gray-600">/mo</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  3 videos per month
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  1080x1920 resolution
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Basic styles
                </li>
              </ul>
              <Link href="/create" className="block w-full py-3 text-center bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium">
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-8 rounded-2xl text-white transform scale-105 shadow-xl">
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-6">$29<span className="text-lg opacity-80">/mo</span></div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  Unlimited videos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  All styles
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  Priority processing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-300">✓</span>
                  No watermark
                </li>
              </ul>
              <Link href="/create" className="block w-full py-3 text-center bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-medium">
                Start Pro
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-700">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="text-4xl font-bold mb-6">Custom</div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Everything in Pro
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  API access
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Custom branding
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  Dedicated support
                </li>
              </ul>
              <button className="w-full py-3 text-center bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Video className="w-6 h-6" />
              <span className="text-lg font-bold">AI Shorts Generator</span>
            </div>
            <p className="text-gray-400">
              © 2025 AI Shorts Generator. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
