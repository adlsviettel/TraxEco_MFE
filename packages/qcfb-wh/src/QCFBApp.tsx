import { Routes, Route } from 'react-router-dom';
import QCFBLayout from './layouts/QCFBLayout';

/**
 * QC Fabric WH App — Keep-alive layout handles all page rendering
 */
export default function QCFBApp() {
  return (
    <Routes>
      <Route path="*" element={<QCFBLayout />} />
    </Routes>
  );
}
