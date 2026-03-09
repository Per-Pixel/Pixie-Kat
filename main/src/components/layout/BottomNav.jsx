import { FaHome, FaGamepad, FaHeadset, FaUser } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: "home", path: "/", icon: <FaHome />, label: "Home" },
    { id: "games", path: "/games", icon: <FaGamepad />, label: "Games" },
    { id: "support", path: "/support", icon: <FaHeadset />, label: "Support" },
    { id: "account", path: "/auth", icon: <FaUser />, label: "Account" },
  ];

  const isActive = (item) => {
    if (item.path === "/") return location.pathname === "/";
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="fixed bottom-0 left-0 z-[100] w-full md:hidden">
      <div className="relative mx-auto max-w-md">
        <div className="absolute inset-0 h-16 bg-white rounded-t-xl shadow-md" />

        <div className="relative z-10 flex justify-between items-center px-4 h-16">
          {navItems.map((item) => (
            <div key={item.id} className="flex-1 flex justify-center">
              <button
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center"
              >
                {isActive(item) ? (
                  <div className="flex flex-col items-center -translate-y-5">
                    <div className="bg-white p-3 rounded-full shadow-lg ring-2 ring-violet-500 text-violet-600 text-lg">
                      {item.icon}
                    </div>
                    <span className="mt-1 text-xs text-violet-600 font-medium">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center mt-3">
                    <div className="text-gray-400 text-lg">{item.icon}</div>
                    <span className="mt-1 text-xs text-gray-400">
                      {item.label}
                    </span>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
