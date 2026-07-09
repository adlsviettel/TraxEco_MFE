/**
 * Suppress the known harmless MUI X DataGrid "useResizeContainer" warning.
 *
 * This warning fires on every initial render because the DataGrid measures
 * its parent container height before the browser has finished layout.
 * The grid then immediately re-measures and renders correctly.
 *
 * See: https://mui.com/r/x-data-grid-no-dimensions
 * This is a widely-known issue with no CSS-only fix in MUI X DataGrid v7.
 */
const originalConsoleError = console.error;

console.error = function (...args: unknown[]) {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('useResizeContainer')
  ) {
    return; // silently ignore this specific warning
  }
  originalConsoleError.apply(console, args);
};

export {}; // make it a module
