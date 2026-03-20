import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Import Layout vào đây
import DispatcherLayout from "../../components/DispatcherLayout";
import DispatcherDashboard from "../../pages/DispatcherPage/DispatcherDashboard";
import SurveySchedulingScreen from "../../pages/DispatcherPage/SurveySchedulingPage";
import SurveyCalendar from "../../pages/DispatcherPage/SurveyCalendar";
import SurveyInput from "../../pages/DispatcherPage/SurveyInput";
import ResourceAllocation from "../../pages/DispatcherPage/ResourceAllocation";
import DispatchedOrders from "../../pages/DispatcherPage/DispatchedOrders";
import ProtectedRoute from "../../components/ProtectRoute/ProtectedRoute";
const RoutesDispatcher = () => {
  return (
    <Routes>

      <Route
        element={
          <ProtectedRoute allowedRoles={["dispatcher"]}>
            <DispatcherLayout />
          </ProtectedRoute>
        }
      >

        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DispatcherDashboard />} />
        <Route path="surveys" element={<SurveySchedulingScreen />} />
        <Route path="calendar" element={<SurveyCalendar />} />
        <Route path="survey-input" element={<SurveyInput />} />
        <Route path="allocation" element={<ResourceAllocation />} />
        <Route path="assigned-orders" element={<DispatchedOrders />} />

      </Route>
    </Routes>
  );
};

export default RoutesDispatcher;