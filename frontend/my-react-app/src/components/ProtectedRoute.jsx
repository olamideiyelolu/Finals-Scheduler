import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  // Simple check for refresh token
  const hasRefreshToken = 
    localStorage.getItem("refresh_token") !== null &&
    localStorage.getItem("refresh_token") !== "undefined";

  // If user has NO refresh token, consider them "logged out"
  if (!hasRefreshToken) {
    // Redirect to /sign-up
    return <Navigate to="/sign-up" replace />;
  }

  // Otherwise, render whatever children we wrapped in <ProtectedRoute>
  return children;
}

export default ProtectedRoute;
