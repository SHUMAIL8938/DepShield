import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
} from "@clerk/clerk-react";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import NewScan from "./pages/NewScan";
import ScanResult from "./pages/ScanResult";
import Webhooks from "./pages/Webhooks";
import Layout from "./components/Layout";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error(
    "Missing Clerk Publishable Key. Add VITE_CLERK_PUBLISHABLE_KEY to your .env",
  );
}

const ProtectedRoute = ({ children }) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut>
      <RedirectToSignIn />
    </SignedOut>
  </>
);

export default function App() {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      fallbackRedirectUrl="/dashboard"
      appearance={{
        baseTheme: undefined,
        variables: {
          colorBackground: "#0a0a0a",
          colorInputBackground: "#111111",
          colorInputText: "#00ff41",
          colorText: "#00ff41",
          colorTextSecondary: "#666666",
          colorPrimary: "#00ff41",
          colorDanger: "#ff3333",
          borderRadius: "0px",
          fontFamily: "JetBrains Mono, monospace",
        },
        elements: {
          card: "bg-terminal-surface border border-terminal-border",
          headerTitle: "text-terminal-green",
          formButtonPrimary: "btn-terminal",
          footerActionLink: "text-terminal-green",
        },
      }}
    >
      {" "}
      <div className="scan-line" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
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
