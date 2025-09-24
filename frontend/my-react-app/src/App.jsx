
import axios from "axios"
import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Schedule from "./pages/Schedule";
import Home from "./pages/Home";
import Prep from "./pages/Prep";
import Sign_up from "./components/LoginFrontend/Sign_up";  // Your sign-in/sign-up page
import ProtectedRoute from "./components/ProtectedRoute";  // The file we created
import Profile from "./pages/Profile";


function App() {
  return (
      <div className="min-h-screen bg-white">
        
        <Routes>
          {/* 
            1) Define login route as open/public:
          */}
          <Route path="/sign-up" element={<Sign_up />} />

          {/* 
            2) Wrap everything else in <ProtectedRoute> 
               so only logged-in users can see them:
          */}
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navbar />
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Navbar />
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Prep"
            element={
              <ProtectedRoute>
                <Navbar />
                <Prep />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <Navbar />
                <Schedule />
              </ProtectedRoute>
            }
          />

        </Routes>
      </div>
  );
}

export default App;


