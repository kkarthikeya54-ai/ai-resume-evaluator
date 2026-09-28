import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { HrRoute, StudentRoute, AuthRoute, OnboardingRoute } from "./components/RoleGuards";
import Velaris from "./components/ui/velaris";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Account from "./pages/Account";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import RefundPolicy from "./pages/RefundPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import CookieConsentBanner from "./components/CookieConsentBanner";
import { SkeletonCard } from "./components/Skeleton";

const Landing = lazy(() => import("./pages/Landing"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const AppPage = lazy(() => import("./pages/AppPage"));
const HrDashboard = lazy(() => import("./pages/HrDashboard"));
const SessionsPage = lazy(() => import("./pages/SessionsPage"));
const CandidateView = lazy(() => import("./pages/CandidateView"));
const NotFound = lazy(() => import("./pages/NotFound"));

function AppContent() {
  const location = useLocation();
  const isLegalPage = ["/privacy", "/terms", "/refund", "/cookies"].includes(location.pathname);

  return (
    <>
      {location.pathname !== "/" && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <Velaris height="100vh" bg="#0B1F3A" colors={["#5B8DEF", "#1D6FF2", "#0D2242", "#F7FAFF", "#2563EB"]} speed={1.0} grain={0.05} className="w-full h-full" />
        </div>
      )}
      <div className="relative z-10">
        <Suspense
          fallback={
            <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          }
        >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/refund" element={<RefundPolicy />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route
            path="/sessions"
            element={
              <AuthRoute>
                <SessionsPage />
              </AuthRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <OnboardingRoute>
                <Onboarding />
              </OnboardingRoute>
            }
          />
          <Route
            path="/account"
            element={
              <AuthRoute>
                <Account />
              </AuthRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <StudentRoute>
                <UploadPage />
              </StudentRoute>
            }
          />
          <Route
            path="/app"
            element={
              <StudentRoute>
                <AppPage />
              </StudentRoute>
            }
          />
          <Route
            path="/hr"
            element={
              <HrRoute>
                <HrDashboard />
              </HrRoute>
            }
          />
          <Route
            path="/candidate/:candidateId"
            element={
              <HrRoute>
                <CandidateView />
              </HrRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </div>
      {!isLegalPage && <CookieConsentBanner />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: { fontFamily: "inherit" },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
