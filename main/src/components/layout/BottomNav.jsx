import { FaBars, FaGamepad, FaHeadset, FaHome, FaUser } from "react-icons/fa";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import MoreMenu from "./MoreMenu";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [isMoreMenuMounted, setIsMoreMenuMounted] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const navItems = [
    { id: "home", path: "/", icon: <FaHome />, label: "Home" },
    { id: "games", path: "/games", icon: <FaGamepad />, label: "Games" },
    { id: "support", path: "/support", icon: <FaHeadset />, label: "Support" },
    { id: "account", path: isAuthenticated ? "/account" : "/auth", icon: <FaUser />, label: "Account" },
    ...(isAuthenticated ? [{ id: "more", path: null, icon: <FaBars />, label: "More", isStatic: true }] : []),
  ];

  const isActive = (item) => {
    if (item.id === "more") return isMoreMenuOpen;
    if (item.isStatic) return false;
    if (item.path === "/") return location.pathname === "/";
    return location.pathname.startsWith(item.path);
  };

  useEffect(() => {
    if (isMoreMenuOpen) {
      setIsMoreMenuOpen(false);
    }
  }, [location.pathname]);

  const openMoreMenu = () => {
    setIsMoreMenuMounted(true);
    requestAnimationFrame(() => {
      setIsMoreMenuOpen(true);
    });
  };

  const closeMoreMenu = () => {
    setIsMoreMenuOpen(false);
  };

  const handleNavClick = (item) => {
    if (item.id === "more") {
      if (isMoreMenuOpen) {
        closeMoreMenu();
      } else {
        openMoreMenu();
      }
      return;
    }

    if (!item.path) {
      return;
    }

    navigate(item.path);
  };

  return (
    <div className="fixed bottom-0 left-0 z-[150] w-full md:hidden">
      <div className="relative mx-auto max-w-md">
        <div className="absolute inset-0 h-16 rounded-t-xl bg-white shadow-md" />

        <div className="relative z-10 flex h-16 items-center justify-between px-4">
          {navItems.map((item) => (
            <div key={item.id} className="flex flex-1 justify-center">
              <button
                type="button"
                onClick={() => handleNavClick(item)}
                className="relative flex flex-col items-center justify-center"
              >
                {isActive(item) ? (
                  <div className="flex -translate-y-5 flex-col items-center">
                    <div className="rounded-full bg-white p-3 text-lg text-violet-600 shadow-lg ring-2 ring-violet-500">
                      {item.icon}
                    </div>
                    <span className="mt-1 text-xs font-medium text-violet-600">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col items-center">
                    <div
                      className={`text-lg ${
                        item.isStatic ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <span
                      className={`mt-1 text-xs ${
                        item.isStatic ? "font-medium text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {isMoreMenuMounted ? (
        <MoreMenu
          isOpen={isMoreMenuOpen}
          onClose={closeMoreMenu}
          onExited={() => setIsMoreMenuMounted(false)}
        />
      ) : null}
    </div>
  );
};

export default BottomNav;
