'use client';

export default function LoadingUI({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6">
          <div className="w-full h-full border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {message}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Please wait...
        </p>
      </div>
    </div>
  );
}
