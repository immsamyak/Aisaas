'use client';

export default function TextInput({ value, onChange, placeholder }) {
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
  const charCount = value.length;

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Your Text
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
      />
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
        <span>{wordCount} words</span>
        <span>{charCount} / 5000 characters</span>
      </div>
    </div>
  );
}
