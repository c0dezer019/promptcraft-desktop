import { Cloud, HardDrive } from 'lucide-react';

/**
 * GenerationModeToggle Component
 * Toggle between cloud and local generation modes
 */
export const GenerationModeToggle = ({ mode, onChange }) => {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <button
        onClick={() => onChange('cloud')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all
          ${mode === 'cloud'
            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }
        `}
      >
        <Cloud className="w-4 h-4" />
        <span className="hidden sm:inline">Cloud</span>
      </button>
      <button
        onClick={() => onChange('local')}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all
          ${mode === 'local'
            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }
        `}
      >
        <HardDrive className="w-4 h-4" />
        <span className="hidden sm:inline">Local</span>
      </button>
    </div>
  );
};

export default GenerationModeToggle;
