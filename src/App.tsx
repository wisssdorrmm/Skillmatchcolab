import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RequireProfile from './components/RequireProfile'
import AppLayout from './layouts/AppLayout'

// Lazy-loaded: each page becomes its own chunk, so the initial bundle only
// ships what's needed for the first screen instead of all ~20 pages at once.
// Auth pages (Login/Signup) are the exception — kept eager since they're
// almost always the very first thing an unauthenticated visitor needs.
import Login from './pages/Login'
import Signup from './pages/Signup'

const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'))
const Home = lazy(() => import('./pages/Home'))
const Explore = lazy(() => import('./pages/Explore'))
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'))
const CreateProject = lazy(() => import('./pages/CreateProject'))
const MyProjects = lazy(() => import('./pages/MyProjects'))
const ManageApplications = lazy(() => import('./pages/ManageApplications'))
const Chats = lazy(() => import('./pages/Chats'))
const TeamChat = lazy(() => import('./pages/TeamChat'))
const ApplicantChat = lazy(() => import('./pages/ApplicantChat'))
const Profile = lazy(() => import('./pages/Profile'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
const DeactivateAccount = lazy(() => import('./pages/DeactivateAccount'))

function PageFallback() {
  return (
    <div className="flex h-dvh items-center justify-center bg-bg text-text-secondary">
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Authenticated */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/deactivate-account" element={<DeactivateAccount />} />

              <Route element={<RequireProfile />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/project/:id" element={<ProjectDetails />} />
                  <Route path="/create-project" element={<CreateProject />} />
                  <Route path="/my-projects" element={<MyProjects />} />
                  <Route path="/project/:id/applications" element={<ManageApplications />} />
                  <Route path="/chats" element={<Chats />} />
                  <Route path="/chats/:projectId" element={<TeamChat />} />
                  <Route path="/project/:projectId/messages/:applicantId" element={<ApplicantChat />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
