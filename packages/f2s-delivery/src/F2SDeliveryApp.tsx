import { Routes, Route } from 'react-router-dom';
import DeliveryLayout from './layouts/DeliveryLayout';

/**
 * F2S Delivery App — Keep-alive layout handles all page rendering
 */
export default function F2SDeliveryApp() {
  return (
    <Routes>
      <Route path="*" element={<DeliveryLayout />} />
    </Routes>
  );
}
