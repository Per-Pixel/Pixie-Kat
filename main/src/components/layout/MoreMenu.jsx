import { useEffect } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Crown,
  LogOut,
  Newspaper,
  Percent,
  ShieldQuestion,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";

const menuItems = [
  { id: "profile", label: "Profile", icon: UserRound, path: "/account" },
  { id: "membership", label: "Membership", icon: Crown, path: "/pricing" },
  { id: "promo", label: "Promo", icon: Percent, comingSoon: true },
  { id: "blog", label: "Blog", icon: Newspaper, comingSoon: true },
  { id: "support", label: "Support", icon: ShieldQuestion, path: "/support" },
];

const MoreMenu = ({ isOpen, onClose, onExited }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setStatusMessage("");
      const timeoutId = window.setTimeout(() => {
        onExited();
      }, 280);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    return undefined;
  }, [isOpen, onExited]);

  const handleItemClick = (item) => {
    if (item.comingSoon) {
      setStatusMessage(`${item.label} coming soon`);
      return;
    }

    if (item.path) {
      navigate(item.path);
    }

    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/");
  };

  return createPortal(
    <div
      className={`more-menu-overlay ${isOpen ? "more-menu-overlay-open" : "more-menu-overlay-closed"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close more menu"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />

      <div className="pointer-events-none absolute inset-0 bg-slate-900/18 backdrop-blur-md transition-opacity duration-300 ease-in-out" />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="More options"
        className={`more-menu-sheet ${isOpen ? "more-menu-sheet-open" : "more-menu-sheet-closed"}`}
      >
        {statusMessage ? (
          <div className="mb-4 rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white">
            {statusMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className="flex flex-col items-center gap-2 rounded-2xl p-2 text-center transition-transform duration-200 ease-in-out hover:-translate-y-0.5"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/5 text-slate-900">
                  <Icon className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <span className="text-sm font-medium text-slate-800">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-col items-center gap-2 rounded-2xl p-2 text-center transition-transform duration-200 ease-in-out hover:-translate-y-0.5"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/5 text-slate-900">
              <LogOut className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <span className="text-sm font-medium text-slate-800">Logout</span>
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default MoreMenu;
