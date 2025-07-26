import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Home from "./pages/home";
import Login from "./pages/login";
import AdminLogin from "./pages/admin-login";
import AdminDashboard from "./pages/admin-dashboard";
import QuizWaiting from "./pages/quiz-waiting";
import QuizPlay from "./pages/quiz-play";
import QuizHistory from "./pages/quiz-history";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
                                <Route
                        path="/quiz/waiting"
                        element={
                          <ProtectedRoute>
                            <QuizWaiting />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/quiz/play"
                        element={
                          <ProtectedRoute>
                            <QuizPlay />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/quiz/history"
                        element={
                          <ProtectedRoute>
                            <QuizHistory />
                          </ProtectedRoute>
                        }
                      />

          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
