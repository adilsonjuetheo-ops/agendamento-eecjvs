import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const NAV_ITEMS = [
  { to: "/",             label: "Dashboard",          icon: "📊" },
  { to: "/reservations", label: "Reservas",            icon: "📋" },
  { to: "/teachers",     label: "Professores",         icon: "👩‍🏫" },
  { to: "/calendar",     label: "Calendário Escolar",  icon: "📅" },
  { to: "/reports",      label: "Relatórios",          icon: "📈" },
];

export default function Layout() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-0.5">Painel Admin</p>
          <p className="text-white font-bold text-lg leading-tight">EECJVS</p>
          <p className="text-gray-500 text-xs truncate mt-1">{email}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-gray-800 transition-colors"
          >
            <span>🚪</span>
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
