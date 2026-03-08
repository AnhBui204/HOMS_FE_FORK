import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StaffLayout from '../../components/StaffLayout/StaffLayout';
import StaffDashboard from '../../pages/StaffPage/Dashboard/StaffDashboard';
import StaffOrderList from '../../pages/StaffPage/OrderList/StaffOrderList';
import StaffDelivery from '../../pages/StaffPage/Delivery/StaffDelivery';
import StaffIncidentReport from '../../pages/StaffPage/IncidentReport/StaffIncidentReport';
import StaffChat from '../../pages/StaffPage/Chat/StaffChat';

const RoutesStaff = () => {
    return (
        <StaffLayout>
            <Routes>
                <Route path="/" element={<Navigate to="dashboard" />} />
                <Route path="dashboard" element={<StaffDashboard />} />
                <Route path="orders"    element={<StaffOrderList />} />
                <Route path="delivery"  element={<StaffDelivery />} />
                <Route path="incidents" element={<StaffIncidentReport />} />
                <Route path="chat"      element={<StaffChat />} />
                <Route path="*"         element={<Navigate to="dashboard" />} />
            </Routes>
        </StaffLayout>
    );
};

export default RoutesStaff;
