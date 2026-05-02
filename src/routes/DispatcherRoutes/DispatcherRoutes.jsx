import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Spin } from "antd";
import { useSelector } from "react-redux";
import DispatcherLayout from "../../components/DispatcherLayout";
import ProtectedRoute from "../../components/ProtectRoute/ProtectedRoute";
import Unauthorized from "../../pages/Exception/Unauthorized/Unauthorized";

const DispatcherDashboard = lazy(() => import("../../pages/DispatcherPage/DispatcherDashboard"));
const SurveySchedulingScreen = lazy(() => import("../../pages/DispatcherPage/SurveySchedulingPage"));
const SurveyCalendar = lazy(() => import("../../pages/DispatcherPage/SurveyCalendar"));
const SurveyInput = lazy(() => import("../../pages/DispatcherPage/SurveyInput/SurveyInput"));
const ResourceAllocation = lazy(() => import("../../pages/DispatcherPage/ResourceAllocation"));
const DispatchedOrders = lazy(() => import("../../pages/DispatcherPage/DispatchedOrders"));
const VideoChat = lazy(() => import("../../pages/VideoChat/VideoChat"));
const NotificationPage = lazy(() => import("../../pages/CommonPage/Notifications/NotificationPage"));

const RouteGuard = ({ children, generalOnly, regionalOnly }) => {
  const { user } = useSelector((state) => state.auth);
  const isGeneral = user?.isGeneral || user?.dispatcherProfile?.isGeneral;

  if (generalOnly && !isGeneral) {
    return <Unauthorized />;
  }
  if (regionalOnly && isGeneral) {
    return <Unauthorized />;
  }
  return children;
};

const RoutesDispatcher = () => {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" tip="Đang tải trang..."><div></div></Spin></div>}>
      <Routes>

        <Route element={<ProtectedRoute allowedRoles={["dispatcher"]}><DispatcherLayout /></ProtectedRoute>}>

          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<RouteGuard generalOnly><DispatcherDashboard /></RouteGuard>} />
          <Route path="surveys" element={<SurveySchedulingScreen />} />
          <Route path="calendar" element={<RouteGuard regionalOnly><SurveyCalendar /></RouteGuard>} />
          <Route path="survey-input" element={<RouteGuard regionalOnly><SurveyInput /></RouteGuard>} />
          <Route path="allocation" element={<RouteGuard generalOnly><ResourceAllocation /></RouteGuard>} />
          <Route path="assigned-orders" element={<RouteGuard generalOnly><DispatchedOrders /></RouteGuard>} />
          <Route path="video-chat" element={<VideoChat />} />
          <Route path="notifications" element={<NotificationPage />} />

        </Route>
      </Routes>
    </Suspense>
  );
};

export default RoutesDispatcher;