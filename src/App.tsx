import { Suspense, lazy, type ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { UnreadProvider } from './context/UnreadContext'
import { ToastProvider } from './components/ui/Toast'
import { AdminRoute, GuestOnly, ProtectedRoute, RequireOnboarded } from './components/guards'
import { AppShell } from './components/layout/AppShell'
import { AdminLayout } from './components/admin/AdminLayout'
import { FullPageSpinner } from './components/ui/States'
import Login from './pages/Login'
import Signup from './pages/Signup'

const page = (load: () => Promise<{ default: ComponentType }>) => lazy(load)

const ForgotPassword = page(() => import('./pages/ForgotPassword'))
const ResetPassword = page(() => import('./pages/ResetPassword'))
const Terms = page(() => import('./pages/Terms'))
const Privacy = page(() => import('./pages/Privacy'))
const Onboarding = page(() => import('./pages/Onboarding'))
const Home = page(() => import('./pages/Home'))
const Explore = page(() => import('./pages/Explore'))
const CreateProject = page(() => import('./pages/CreateProject'))
const EditProject = page(() => import('./pages/EditProject'))
const ProjectDetails = page(() => import('./pages/ProjectDetails'))
const ManageApplications = page(() => import('./pages/ManageApplications'))
const MyProjects = page(() => import('./pages/MyProjects'))
const Community = page(() => import('./pages/Community'))
const CommunityRoom = page(() => import('./pages/CommunityRoom'))
const People = page(() => import('./pages/People'))
const Messages = page(() => import('./pages/Messages'))
const Conversation = page(() => import('./pages/Conversation'))
const TeamChat = page(() => import('./pages/TeamChat'))
const ApplicantChat = page(() => import('./pages/ApplicantChat'))
const Funding = page(() => import('./pages/Funding'))
const FundingApply = page(() => import('./pages/FundingApply'))
const Leaderboard = page(() => import('./pages/Leaderboard'))
const Notifications = page(() => import('./pages/Notifications'))
const Profile = page(() => import('./pages/Profile'))
const Settings = page(() => import('./pages/Settings'))
const EditProfile = page(() => import('./pages/EditProfile'))
const AdminOverview = page(() => import('./pages/admin/AdminOverview'))
const AdminMembers = page(() => import('./pages/admin/AdminMembers'))
const AdminActivity = page(() => import('./pages/admin/AdminActivity'))
const AdminInsights = page(() => import('./pages/admin/AdminInsights'))
const AdminProjects = page(() => import('./pages/admin/AdminProjects'))
const AdminImport = page(() => import('./pages/admin/AdminImport'))
const AdminFunding = page(() => import('./pages/admin/AdminFunding'))
const AdminCommunity = page(() => import('./pages/admin/AdminCommunity'))
const AdminBroadcast = page(() => import('./pages/admin/AdminBroadcast'))
const AdminAdmins = page(() => import('./pages/admin/AdminAdmins'))
const DeactivateAccount = page(() => import('./pages/DeactivateAccount'))

function RedirectProjectChat() {
  const { projectId } = useParams()
  return <Navigate to={`/chats/${projectId}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <UnreadProvider>
            <Suspense fallback={<FullPageSpinner />}>
              <Routes>
                <Route element={<GuestOnly />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/deactivate-account" element={<DeactivateAccount />} />

                  <Route element={<RequireOnboarded />}>
                    <Route element={<AppShell />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/explore" element={<Explore />} />
                      <Route path="/projects/new" element={<CreateProject />} />
                      <Route path="/project/:id" element={<ProjectDetails />} />
                      <Route path="/project/:id/edit" element={<EditProject />} />
                      <Route path="/project/:id/applications" element={<ManageApplications />} />
                      <Route path="/project/:projectId/messages/:applicantId" element={<ApplicantChat />} />
                      <Route path="/my-projects" element={<MyProjects />} />
                      <Route path="/community" element={<Community />} />
                      <Route path="/community/:slug" element={<CommunityRoom />} />
                      <Route path="/people" element={<People />} />
                      <Route path="/messages" element={<Messages />} />
                      <Route path="/messages/:id" element={<Conversation />} />
                      <Route path="/chats/:projectId" element={<TeamChat />} />
                      <Route path="/funding" element={<Funding />} />
                      <Route path="/funding/apply" element={<FundingApply />} />
                      <Route path="/leaderboard" element={<Leaderboard />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/u/:id" element={<Profile />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/settings/profile" element={<EditProfile />} />
                    </Route>

                    <Route element={<AdminRoute />}>
                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminOverview />} />
                        <Route path="members" element={<AdminMembers />} />
                        <Route path="activity" element={<AdminActivity />} />
                        <Route path="insights" element={<AdminInsights />} />
                        <Route path="projects" element={<AdminProjects />} />
                        <Route path="import" element={<AdminImport />} />
                        <Route path="funding" element={<AdminFunding />} />
                        <Route path="community" element={<AdminCommunity />} />
                        <Route path="broadcast" element={<AdminBroadcast />} />
                        <Route path="admins" element={<AdminAdmins />} />
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                      </Route>
                    </Route>
                  </Route>
                </Route>

                {/* Old links keep working */}
                <Route path="/create-project" element={<Navigate to="/projects/new" replace />} />
                <Route path="/profile-setup" element={<Navigate to="/onboarding" replace />} />
                <Route path="/chats" element={<Navigate to="/messages" replace />} />
                <Route path="/project-chat/:projectId" element={<RedirectProjectChat />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </UnreadProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
