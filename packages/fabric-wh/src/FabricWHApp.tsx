/**
 * Fabric Warehouse App Entry Point
 * Keep-alive layout: pages mount once, never unmount
 */
import { Routes, Route } from 'react-router-dom';
import FabricLayout from './components/FabricLayout';

export default function FabricWHApp() {
  return (
    <Routes>
      <Route path="*" element={<FabricLayout />} />
    </Routes>
  );
}
