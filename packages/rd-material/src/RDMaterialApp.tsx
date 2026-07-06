import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RDLayout from './components/RDLayout';

import FabricListPage from './pages/FabricListPage';
import FabricDetailPage from './pages/FabricDetailPage';
import LabelPrintPage from './pages/LabelPrintPage';
import ScanOutPage from './pages/ScanOutPage';
import ScanHistoryPage from './pages/ScanHistoryPage';
import ScanQueryPage from './pages/ScanQueryPage';
import AccessoryListPage from './pages/AccessoryListPage';
import AccessoryDetailPage from './pages/AccessoryDetailPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import YardageListPage from './pages/YardageListPage';
import YardageDetailPage from './pages/YardageDetailPage';
import { AdminPage } from '@traxeco/shared';

/**
 * R&D Material Library — sub-app entry point.
 * Mounted at /rd-material/* in the main App.tsx router.
 */
const RDMaterialApp: React.FC = () => (
  <Routes>
    <Route element={<RDLayout />}>
      <Route index element={<Navigate to="fabric" replace />} />

      {/* ── Material ── */}
      <Route path="fabric" element={<FabricListPage />} />
      <Route path="fabric/:id" element={<FabricDetailPage />} />
      <Route path="accessory" element={<AccessoryListPage />} />
      <Route path="accessory/:id" element={<AccessoryDetailPage />} />
      <Route path="yardage" element={<YardageListPage />} />
      <Route path="yardage/:id" element={<YardageDetailPage />} />
      {/* ── Design ── */}
      <Route path="product" element={<ProductListPage />} />
      <Route path="product/:id" element={<ProductDetailPage />} />


      {/* ── Tools ── */}
      <Route path="label/:id" element={<LabelPrintPage />} />
      <Route path="scan" element={<ScanOutPage />} />
      <Route path="scan-history" element={<ScanHistoryPage />} />
      <Route path="scan-query" element={<ScanQueryPage />} />

      {/* Admin */}
      <Route path="admin" element={<AdminPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/rd-material" replace />} />
    </Route>
  </Routes>
);

export default RDMaterialApp;
