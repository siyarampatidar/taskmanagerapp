import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  MessageSquare,
  PieChart,
  Settings,
  ShieldCheck,
  CreditCard,
  Calendar,
  ClipboardList,
  X,
  Clock,
  Zap,
  Building2,
  Crown
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedSubmenu, setExpandedSubmenu] = React.useState(null);
  const [hoveredRect, setHoveredRect] = React.useState(null);
  const [hoveredLink, setHoveredLink] = React.useState(null);

  const isLinkActive = (path) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  const links = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'teamhead', 'employee', 'sales', 'marketing', 'hr', 'superadmin'] },
    { name: 'HRM', path: '/dashboard/hrm', icon: Users, roles: ['admin', 'manager', 'hr'] },
    { name: 'Attendance', path: '/dashboard/attendance', icon: Calendar, roles: ['admin', 'manager', 'teamhead', 'employee', 'sales', 'marketing', 'hr'] },
    { name: 'Tasks', path: '/dashboard/tasks', icon: CheckSquare, roles: ['admin', 'manager', 'teamhead', 'employee', 'sales', 'marketing', 'hr'] },
    {
      name: 'CRM',
      path: '/dashboard/crm',
      icon: Briefcase,
      roles: ['admin', 'manager', 'sales', 'marketing'],
      subLinks: [
        { name: 'Leads', path: '/dashboard/crm?tab=leads' },
        { name: 'Follow-ups', path: '/dashboard/follow-ups' },
        { name: 'Contacts', path: '/dashboard/crm?tab=contacts' },
        { name: 'Accounts', path: '/dashboard/crm?tab=accounts' },
        { name: 'Deals', path: '/dashboard/crm?tab=deals' },
        { name: 'Documents', path: '/dashboard/crm?tab=documents' },
      ]
    },
    { name: 'Chat', path: '/dashboard/chat', icon: MessageSquare, roles: ['admin', 'manager', 'teamhead', 'employee', 'sales', 'marketing', 'hr'] },
    { name: 'Reports', path: '/dashboard/reports', icon: PieChart, roles: ['admin', 'manager', 'hr'] },
    { name: 'Daily Reports', path: '/dashboard/daily-reports', icon: ClipboardList, roles: ['admin', 'manager', 'teamhead', 'employee', 'sales', 'marketing', 'hr'] },
    { name: 'Presence Map', path: '/dashboard/activity', icon: Clock, roles: ['admin'] },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings, roles: ['admin'] },
    { name: 'Billing', path: '/dashboard/billing', icon: CreditCard, roles: ['admin', 'manager'] },
    { name: 'Subscription', path: '/dashboard/subscription', icon: Zap, roles: ['admin'] },
    { name: 'Buy Plan', path: '/select-plan', icon: Crown, roles: ['admin'] },
    
    // Super Admin Links
    { name: 'Platform Overview', path: '/dashboard/superadmin', icon: ShieldCheck, roles: ['superadmin'] },
    { name: 'Subscription Plans', path: '/dashboard/superadmin/plans', icon: Zap, roles: ['superadmin'] },
    { name: 'Registered Companies', path: '/dashboard/superadmin/companies', icon: Building2, roles: ['superadmin'] },
  ];

  return (
    <aside className={`w-64 h-screen border-r border-slate-100 bg-white flex flex-col fixed left-0 top-0 z-[100] transition-all duration-300 lg:translate-x-0 group ${isOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'}`}>
      <div className="px-6 h-16 flex items-center justify-between border-b border-slate-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
            TF
          </div>
          <span className="font-bold text-slate-800 text-base">TeamFlow</span>
        </div>
        <button onClick={onClose} className="cursor-pointer lg:hidden text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2 z-[100] hide-scrollbar overflow-y-auto overflow-x-visible">
        {links.map((link) => {
          if (!link.roles.includes(user?.role)) return null;
          const Icon = link.icon;

          if (link.subLinks) {
            return (
              <div
                key={link.name}
                className="relative group/sidebar-item"
                onMouseEnter={() => setExpandedSubmenu(link.name)}
                onMouseLeave={() => setExpandedSubmenu(null)}
              >
                <div className="flex items-center w-full">
                  <NavLink
                    to={link.path}
                    end={link.path === '/dashboard'}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredRect(rect);
                      setHoveredLink(link);
                      setExpandedSubmenu(link.name);
                    }}
                    onMouseLeave={() => {
                      // We'll manage closure via the portal container's mouse events
                    }}
                    onClick={(e) => {
                      setExpandedSubmenu(expandedSubmenu === link.name ? null : link.name);
                      if (window.innerWidth < 1024) e.preventDefault();
                      else onClose();
                    }}
                    className={({ isActive }) =>
                      `flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all group ${isActive || expandedSubmenu === link.name
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 group-hover:bg-slate-50 group-hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-4.5 h-4.5 transition-colors ${isActive || expandedSubmenu === link.name ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        <span>{link.name}</span>
                      </>
                    )}
                  </NavLink>
                </div>

                {/* PC Flyout Menu (Portal Implementation) */}
                {hoveredLink?.name === link.name && hoveredRect && createPortal(
                  <div
                    className="hidden lg:block fixed bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-[999999] overflow-hidden py-2 animate-in fade-in slide-in-from-left-1 duration-200"
                    style={{
                      left: `${hoveredRect.right + 2}px`,
                      top: `${hoveredRect.top - 5}px`,
                      width: '190px'
                    }}
                    onMouseEnter={() => {
                      setHoveredLink(link);
                      setExpandedSubmenu(link.name);
                    }}
                    onMouseLeave={() => {
                      setHoveredLink(null);
                      setHoveredRect(null);
                      setExpandedSubmenu(null);
                    }}
                  >
                    <div className="px-4 pb-2 mb-1 border-b border-slate-50 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Navigation</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="px-1.5 space-y-0.5">
                      {link.subLinks.map(sub => (
                        <NavLink
                          key={sub.name}
                          to={sub.path}
                          className={
                            `flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all duration-300 ${isLinkActive(sub.path)
                              ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                            }`
                          }
                          onClick={() => {
                            onClose();
                            setHoveredLink(null);
                            setHoveredRect(null);
                          }}
                        >
                          <div className={`w-1.2 h-1.2 rounded-full ${isLinkActive(sub.path) ? 'bg-blue-500' : 'bg-slate-300'}`} />
                          {sub.name}
                        </NavLink>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}

                {/* Mobile Accordion */}
                <div className={`lg:hidden pl-11 pr-4 py-2 space-y-1 bg-slate-50/50 rounded-b-xl -mt-2 pt-4 transition-all overflow-hidden ${expandedSubmenu === link.name ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 py-0 pt-0'}`}>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">Modules</div>
                  {link.subLinks.map(sub => (
                    <NavLink
                      key={sub.name}
                      to={sub.path}
                      className={
                        `flex items-center gap-2.5 py-1.5 text-[13px] font-medium transition-all duration-300 ${isLinkActive(sub.path)
                          ? 'text-blue-600'
                          : 'text-slate-500 hover:text-blue-600 hover:pl-2'
                        }`
                      }
                      onClick={onClose}
                    >
                      <div className="w-1 h-1 rounded-full bg-current opacity-40 transition-colors" />
                      {sub.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/dashboard'}
              onMouseEnter={() => {
                setHoveredLink(null);
                setHoveredRect(null);
                setExpandedSubmenu(null);
              }}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all ${isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span>{link.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Profile Section */}
      <div className="p-4 border-t border-slate-50">
        <NavLink 
          to="/dashboard/profile"
          onClick={onClose}
          className={({ isActive }) => 
            `flex items-center gap-3 p-3 rounded-2xl transition-all group ${
              isActive ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50'
            }`
          }
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-100 border-2 border-white overflow-hidden shrink-0">
            {user?.image ? (
              <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-900 truncate tracking-tight">{user?.name}</p>
            <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{user?.role}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
