import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Spin } from "antd";

// Import Layout vào đây
import DispatcherLayout from "../../components/DispatcherLayout";
import ProtectedRoute from "../../components/ProtectRoute/ProtectedRoute";

const DispatcherDashboard = lazy(() => import("../../pages/DispatcherPage/DispatcherDashboard"));
const SurveySchedulingScreen = lazy(() => import("../../pages/DispatcherPage/SurveySchedulingPage"));
const SurveyCalendar = lazy(() => import("../../pages/DispatcherPage/SurveyCalendar"));
const SurveyInput = lazy(() => import("../../pages/DispatcherPage/SurveyInput"));
const ResourceAllocation = lazy(() => import("../../pages/DispatcherPage/ResourceAllocation"));
const DispatchedOrders = lazy(() => import("../../pages/DispatcherPage/DispatchedOrders"));
const VideoChat = lazy(() => import("../../pages/VideoChat/VideoChat"));

const RoutesDispatcher = () => {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" tip="Đang tải trang..." /></div>}>
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
          <Route path="video-chat" element={<VideoChat />} />

        </Route>
      </Routes>
    </Suspense>
  );
};

export default RoutesDispatcher;