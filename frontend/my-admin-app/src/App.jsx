import { Routes, Route } from 'react-router-dom';
import Sign_in from './components/Sign_in';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './Pages/Home';
import Profile from './Pages/Profile';
import Navbar from './components/Navbar';



function App() {
  return (
      <div className="min-h-screen bg-white">
        
        <Routes>
          {/* 
            1) Define your login route as open/public:
          */}
          <Route path="/admin-sign-in" element={<Sign_in />} />
          {/* <Route path="/sign-in" element={<Sign_in />} /> */}

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

        </Routes>
      </div>
  );
}

export default App;
