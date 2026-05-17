import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import NewScan from './pages/NewScan';
import ScanResult from './pages/ScanResult';
import Webhooks from './pages/Webhooks';
import Layout from './components/Layout';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to your .env');
}

const ProtectedRoute = ({ children }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><RedirectToSignIn /></SignedOut>
  </>
);

export default function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard">
      <div className="scan-line" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan/new" element={<NewScan />} />
            <Route path="/scan/:id" element={<ScanResult />} />
            <Route path="/webhooks" element={<Webhooks />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  );
}
