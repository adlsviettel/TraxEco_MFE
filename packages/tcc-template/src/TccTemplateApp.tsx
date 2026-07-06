import { Routes, Route } from 'react-router-dom';
import TccTemplateLayout from './layouts/TccTemplateLayout';

// Intercept and silence annoying Recharts ResponsiveContainer warnings when mounted hidden
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('The width') &&
      args[0].includes('of chart should be greater than 0')
    ) {
      return;
    }
    originalWarn(...args);
  };
}

/**
 * TCC Template Request App — Keep-alive layout handles all page rendering
 */
export default function TccTemplateApp() {
  return (
    <Routes>
      <Route path="*" element={<TccTemplateLayout />} />
    </Routes>
  );
}
