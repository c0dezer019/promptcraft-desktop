import { useState } from 'react';

/**
 * useHistory Hook - Manages prompt history
 * @returns {object} History state and handlers
 */
export const useHistory = () => {
  const [history, setHistory] = useState([]);

  const addToHistory = (tool, text) => {
    const entry = {
      tool,
      text: text.substring(0, 60) + '...',
      timestamp: new Date()
    };
    setHistory(prev => [entry, ...prev]);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return {
    history,
    addToHistory,
    clearHistory
  };
};
