import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout/AdminLayout';
import Dashboard from '../../pages/AdminPage/Dashboard/Dashboard';
import UserManagement from '../../pages/AdminPage/UserManagement/UserManagement';
import UserProfile from '../../pages/AdminPage/UserManagement/UserProfile';
import VehicleManagement from '../../pages/AdminPage/VehicleManagement/VehicleManagement';
import PricingManagement from '../../pages/AdminPage/Pricing/PricingManagement';
import ReportManagement from '../../pages/AdminPage/Report/ReportManagement';
import ContractManagement from '../../pages/AdminPage/Contract/ContractManagement';
import ProtectedRoute from "../../components/ProtectRoute/ProtectedRoute";

const RoutesAdmin = () => {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="users/:id" element={<UserProfile />} />
          <Route path="vehicles" element={<VehicleManagement />} />
          <Route path="pricing" element={<PricingManagement />} />
          <Route path="reports" element={<ReportManagement />} />
          <Route path="contracts" element={<ContractManagement />} />
          <Route path="*" element={<Navigate to="dashboard" />} />
        </Routes>
      </AdminLayout>
    </ProtectedRoute>
  );
};

export default RoutesAdmin;