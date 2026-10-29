import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider, useStore } from './lib/store';
import { ToastProvider } from './components/ui';
import { Logo } from './components/bits';

const Landing = lazy(() => import('./site/Landing'));
const Login = lazy(() => import('./site/Login'));
const PanelLayout = lazy(() => import('./panel/PanelLayout'));
const Overview = lazy(() => import('./panel/Overview'));
const Attendance = lazy(() => import('./panel/Attendance'));
const Students = lazy(() => import('./panel/Students'));
const Schedule = lazy(() => import('./panel/Schedule'));
const Ranking = lazy(() => import('./panel/Ranking'));
const Finance = lazy(() => import('./panel/Finance'));
const Notices = lazy(() => import('./panel/Notices'));
const AppPreview = lazy(() => import('./panel/AppPreview'));
const StudentLayout = lazy(() => import('./student/StudentLayout'));
const Home = lazy(() => import('./student/Home'));
const Classes = lazy(() => import('./student/Classes'));
const History = lazy(() => import('./student/History'));
const IdCard = lazy(() => import('./student/IdCard'));
const Profile = lazy(() => import('./student/Profile'));
const Graduation = lazy(() => import('./student/Graduation'));
const Payments = lazy(() => import('./student/Payments'));

function RequireAuth({ children, role }: { children: ReactNode; role?: 'professor' }) {
  const { me } = useStore();
  const loc = useLocation();
  if (!me) return <Navigate to="/entrar" replace state={{ from: loc.pathname }} />;
  // Só o professor acessa o painel
  if (role === 'professor' && me.role !== 'professor') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper">
      <Logo size={48} className="animate-pulse" />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/entrar" element={<Login />} />
            <Route
              path="/painel"
              element={
                <RequireAuth role="professor">
                  <PanelLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Overview />} />
              <Route path="chamada" element={<Attendance />} />
              <Route path="alunos" element={<Students />} />
              <Route path="grade" element={<Schedule />} />
              <Route path="graduacao" element={<Ranking />} />
              <Route path="financeiro" element={<Finance />} />
              <Route path="avisos" element={<Notices />} />
              <Route path="app" element={<AppPreview />} />
            </Route>
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <StudentLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Home />} />
              <Route path="aulas" element={<Classes />} />
              <Route path="historico" element={<History />} />
              <Route path="carteirinha" element={<IdCard />} />
              <Route path="perfil" element={<Profile />} />
              <Route path="graduacao" element={<Graduation />} />
              <Route path="financeiro" element={<Payments />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  );
}
