import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Import Layout vào đây
import DispatcherLayout from "../../components/DispatcherLayout"; 

import SurveySchedulingScreen from "../../pages/DispatcherPage/SurveySchedulingPage";
import SurveyCalendar from "../../pages/DispatcherPage/SurveyCalendar";
import SurveyInput from "../../pages/DispatcherPage/SurveyInput";
import ResourceAllocation from "../../pages/DispatcherPage/ResourceAllocation";
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
        
        <Route path="/" element={<Navigate to="surveys" replace />} />
        <Route path="surveys" element={<SurveySchedulingScreen />} />
        <Route path="calendar" element={<SurveyCalendar/>} />
        <Route path="survey-input" element={<SurveyInput/>} />
        <Route path="allocation" element={<ResourceAllocation/>} />
        
      </Route>
    </Routes>
  );
};

export default RoutesDispatcher;