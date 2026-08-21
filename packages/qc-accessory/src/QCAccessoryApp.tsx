import { Routes, Route } from 'react-router-dom';
import QCAccessoryLayout from './layouts/QCAccessoryLayout';

export default function QCAccessoryApp() {
  return (
    <Routes>
      <Route path="*" element={<QCAccessoryLayout />} />
    </Routes>
  );
}
