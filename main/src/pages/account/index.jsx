import { useMemo } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import DesktopAccountView from "./DesktopAccountView";
import MobileAccountView from "./MobileAccountView";
import { getAccountProfile, pageBackground } from "./accountShared";

const AccountPage = () => {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useMemo(() => getAccountProfile(user), [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 pb-28 pt-28 sm:px-6 md:px-8" style={pageBackground}>
        <div className="mx-auto max-w-7xl rounded-[28px] border border-white/70 bg-white/70 p-6 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl">
          <p className="text-lg font-medium text-slate-500">Loading account...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <div className="hidden md:block">
        <DesktopAccountView profile={profile} onLogout={handleLogout} />
      </div>
      <div className="md:hidden">
        <MobileAccountView profile={profile} onLogout={handleLogout} />
      </div>
    </>
  );
};

export default AccountPage;
