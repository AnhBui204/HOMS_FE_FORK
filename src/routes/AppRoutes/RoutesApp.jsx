import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "../../pages/CommonPage/HomePage/HomePage";
import AboutUs from "../../pages/CommonPage/HomePage/AboutUs";
import ViewServicePackages from "../../pages/CommonPage/ViewServicePackages/ViewServicePackages";
import AIAssistant from "../../utils/AIAssistant";

const RoutesApp = () => {
  return (
    <>
      <AIAssistant />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutUs />} />
      </Routes>
    </>
  );
};

export default RoutesApp;
