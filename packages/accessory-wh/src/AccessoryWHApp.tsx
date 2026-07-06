import { Routes, Route } from 'react-router-dom';
import AccessoryLayout from './layouts/AccessoryLayout';

export default function AccessoryWHApp() {
  return (
    <Routes>
      <Route path="*" element={<AccessoryLayout />} />
    </Routes>
  );
}
