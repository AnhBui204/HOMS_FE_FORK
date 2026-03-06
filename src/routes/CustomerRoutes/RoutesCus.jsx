import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Profile from "../../pages/CommonPage/Profile/Profile";
import ViewMovingOrder from "../../pages/CustomerPage/ViewMovingOrder/ViewMovingOrder";
import ViewServicePackages from "../../pages/CommonPage/ViewServicePackages/ViewServicePackages";
import CreateMovingOrder from "../../pages/CustomerPage/CreateMovingOrder/CreateMovingOrder";
import ConfirmMovingOrder from "../../pages/CustomerPage/ConfirmMovingOrder/ConfirmMovingOrder";
import MovingRequestContract from "../../pages/CustomerPage/MovingRequestContract/MovingRequestContract";
import Deposit from "../../pages/CustomerPage/Deposit/Deposit";
import Dashboard from "../../pages/CustomerPage/Dashboard/Dashboard";
// import CustomerLayout from "../../pages/CustomerPage/components/layout/CustomerLayout";

const RoutesCus = () => {
  return (
    <Routes>
      {/* <Route element={<CustomerLayout />}> */}

      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/order" element={<ViewMovingOrder />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/service-packages" element={<ViewServicePackages />} />
      <Route path="/create-order" element={<CreateMovingOrder />} />
      <Route path="/create-moving-order" element={<CreateMovingOrder />} />
      <Route path="/confirm-order" element={<ConfirmMovingOrder />} />
      <Route path="/moving-request-contract" element={<MovingRequestContract />} />
      <Route path="/deposit" element={<Deposit />} />

      {/* </Route> */}
    </Routes>
  );
};

export default RoutesCus;