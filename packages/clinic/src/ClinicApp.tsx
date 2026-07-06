import { Routes, Route } from 'react-router-dom';
import ClinicLayout from './layouts/ClinicLayout';

export default function ClinicApp() {
  return (
    <Routes>
      <Route path="*" element={<ClinicLayout />} />
    </Routes>
  );
}
