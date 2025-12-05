import { HardDrive, ExternalLink, Settings } from 'lucide-react';

/**
 * LocalEmptyState Component
 * Displays when user switches to local mode but has no tools configured
 */
export const LocalEmptyState = ({ onConfigure }) => {
  return (
    <div className="flex items-center justify-center h-full min-h-[500px]">
      <div className="text-center max-w-md px-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <HardDrive className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          No Local Generation Tools Configured
        </h2>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          Configure a local tool like ComfyUI, Automatic1111, or InvokeAI to generate images locally on your machine.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onConfigure}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Configure Local Tool
          </button>
          <button
            onClick={() => {
              // Dead-end link for now
              console.log('Learn more clicked - no destination yet');
            }}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            Learn More
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            Local generation gives you full control, privacy, and the ability to use custom models without API costs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocalEmptyState;
