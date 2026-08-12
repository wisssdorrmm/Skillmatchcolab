import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RequireProfile from './components/RequireProfile'
import AppLayout from './layouts/AppLayout'

import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ProfileSetup from './pages/ProfileSetup'
import Home from './pages/Home'
import ProjectDetails from './pages/ProjectDetails'
import CreateProject from './pages/CreateProject'
import MyProjects from './pages/MyProjects'
import ManageApplications from './pages/ManageApplications'
import Chats from './pages/Chats'
import TeamChat from './pages/TeamChat'
import Profile from './pages/Profile'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Authenticated */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile-setup" element={<ProfileSetup />} />

            <Route element={<RequireProfile />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/project/:id" element={<ProjectDetails />} />
                <Route path="/create-project" element={<CreateProject />} />
                <Route path="/my-projects" element={<MyProjects />} />
                <Route path="/project/:id/applications" element={<ManageApplications />} />
                <Route path="/chats" element={<Chats />} />
                <Route path="/chats/:projectId" element={<TeamChat />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
