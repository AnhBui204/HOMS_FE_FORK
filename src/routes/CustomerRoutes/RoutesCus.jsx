import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Profile from "../../pages/CommonPage/Profile/Profile";
import ViewMovingOrder from "../../pages/CustomerPage/ViewMovingOrder/ViewMovingOrder";
import ViewServicePackages from "../../pages/CommonPage/ViewServicePackages/ViewServicePackages";
import CreateMovingOrder from "../../pages/CustomerPage/CreateMovingOrder/CreateMovingOrder";
import ConfirmMovingOrder from "../../pages/CustomerPage/ConfirmMovingOrder/ConfirmMovingOrder";
import SurveyAgreement from "../../pages/CustomerPage/SurveyAgreement/SurveyAgreement";
import Deposit from "../../pages/CustomerPage/Deposit/Deposit";
import Dashboard from "../../pages/CustomerPage/Dashboard/Dashboard";
import SignContract from "../../pages/CustomerPage/SignContract/SignContract";
import MyContract from "../../pages/CustomerPage/Contract/MyContract";
// import CustomerLayout from "../../pages/CustomerPage/components/layout/CustomerLayout";
import ProtectedRoute from "../../components/ProtectRoute/ProtectedRoute";
import VideoChat from "../../pages/VideoChat/VideoChat";
import AIAssistant from "../../components/AIAssistant/AIAssistant";

const RoutesCus = () => {
  return (
    <>
      <AIAssistant />
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/order"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ViewMovingOrder />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/service-packages"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ViewServicePackages />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-order"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CreateMovingOrder />
            </ProtectedRoute>
          }
        />

        <Route
          path="/confirm-order"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <ConfirmMovingOrder />
            </ProtectedRoute>
          }
        />

        <Route
          path="/survey-agreement"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <SurveyAgreement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/deposit"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <Deposit />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sign-contract/:ticketId"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <SignContract />
            </ProtectedRoute>
          }
        />

        <Route
          path="/video-chat"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <VideoChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contracts"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <MyContract />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
};
export default RoutesCus;
