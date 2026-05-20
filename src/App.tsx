import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Receiving from './pages/Receiving';
import WriteOff from './pages/WriteOff';
import ExpiryControl from './pages/ExpiryControl';
import RecallManagement from './pages/RecallManagement';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/lots" element={<div>Lots Management (WIP)</div>} />
          <Route path="/receiving" element={<Receiving />} />
          <Route path="/write-off" element={<WriteOff />} />
          <Route path="/movements" element={<div>Stock Movements (WIP)</div>} />
          <Route path="/expiry-control" element={<ExpiryControl />} />
          <Route path="/recall" element={<RecallManagement />} />
          <Route path="/settings" element={<div>Settings (WIP)</div>} />
        </Routes>
      </Layout>
      <Toaster theme="dark" position="top-right" />
    </Router>
  );
}
