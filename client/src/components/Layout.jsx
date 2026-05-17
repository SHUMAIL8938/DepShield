import { useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth, useUser, UserButton } from "@clerk/clerk-react";
import { setTokenGetter } from "../utils/api";

export default function Layout() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const location = useLocation();

  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  const navLink = (path, label) => {
    const active = location.pathname === path;
    return (
      <Link
        to={path}
        className={`text-xs tracking-widest uppercase transition-all duration-150 px-2 py-1 ${
          active
            ? "text-terminal-green glow-sm border-b border-terminal-green"
            : "text-terminal-gray hover:text-terminal-green-dim"
        }`}
      >
        {active ? "> " : ""}
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-terminal-bg">
      <nav className="border-b border-terminal-border bg-terminal-surface px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-terminal-green glow font-bold text-sm tracking-widest"
          >
            [DEPSHIELD]
          </Link>
          
          <div className="flex items-center gap-4">
            {navLink("/dashboard", "Dashboard")}
            {navLink("/scan/new", "New Scan")}
            {navLink("/webhooks", "Webhooks")}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-terminal-gray">
            {user?.username || user?.firstName}
          </span>
          {/* Clerk's built-in user button — handles sign out, profile, etc. */}
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
