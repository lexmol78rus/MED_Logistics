import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AuthHydrationGate from './components/auth/AuthHydrationGate';
import RequireAuth from './components/auth/RequireAuth';
import RequireRole from './components/auth/RequireRole';
import GuestOnly from './components/auth/GuestOnly';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Products from './pages/Products';
import ProductNames from './pages/ProductNames';
import ProductDetails from './pages/ProductDetails';
import Lots from './pages/Lots';
import Movements from './pages/Movements';
import Receiving from './pages/Receiving';
import WriteOff from './pages/WriteOff';
import ExpiryControl from './pages/ExpiryControl';
import RecallManagement from './pages/RecallManagement';
import Settings from './pages/Settings';
import AccessSettings from './pages/AccessSettings';
import WriteOffDestinations from './pages/WriteOffDestinations';
import Users from './pages/Users';
import Audit from './pages/Audit';
import Terminal from './pages/Terminal';
import Shipments from './pages/Shipments';
import ShipmentPrint from './pages/ShipmentPrint';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import LegalEntities from './pages/LegalEntities';
import Forbidden from './pages/Forbidden';
import { Toaster } from '@/components/ui/sonner';
import BuildVersionCheck from './components/BuildVersionCheck';

export default function App() {
  return (
    <Router>
      <BuildVersionCheck />
      <AuthHydrationGate>
        <Routes>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/forbidden" element={<Forbidden />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<RequireRole />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product-names" element={<ProductNames />} />
                <Route path="/products/:id" element={<ProductDetails />} />
                <Route path="/lots" element={<Lots />} />
                <Route path="/receiving" element={<Receiving />} />
                <Route path="/write-off" element={<WriteOff />} />
                <Route path="/movements" element={<Movements />} />
                <Route path="/expiry-control" element={<ExpiryControl />} />
                <Route path="/recall" element={<RecallManagement />} />
                <Route path="/shipments" element={<Shipments />} />
                <Route path="/shipments/:id/print" element={<ShipmentPrint />} />
                <Route path="/counterparties/customers" element={<Customers />} />
                <Route path="/counterparties/suppliers" element={<Suppliers />} />
                <Route path="/counterparties/legal-entities" element={<LegalEntities />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/writeoff-destinations" element={<WriteOffDestinations />} />
                <Route path="/settings/access" element={<AccessSettings />} />
                <Route path="/users" element={<Users />} />
                <Route path="/audit" element={<Audit />} />
              </Route>
              <Route element={<RequireRole />}>
                <Route path="/terminal" element={<Terminal />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthHydrationGate>
      <Toaster />
    </Router>
  );
}
