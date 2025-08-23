// History-related UI helpers
// Usage:
//   import { updateHistoryButtons } from './history.js';
//   updateHistoryButtons({ backButton, forwardButton, navigationHistory, historyIndex });

export function updateHistoryButtons({ backButton, forwardButton, navigationHistory, historyIndex }) {
  if (!backButton || !forwardButton || !Array.isArray(navigationHistory)) return;
  backButton.style.display = navigationHistory.length > 1 ? 'inline-block' : 'none';
  forwardButton.style.display = navigationHistory.length > 1 ? 'inline-block' : 'none';
  backButton.disabled = historyIndex <= 0;
  forwardButton.disabled = historyIndex >= navigationHistory.length - 1;
}
