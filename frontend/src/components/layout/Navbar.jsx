import React, { useState } from 'react';
import { Bell, Search, User as UserIcon, LogOut, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../common/NotificationBell';

const Navbar = ({ onToggle }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <header className="h-16 bg-white flex items-center justify-between px-6 sticky top-0 z-20 border-b border-slate-100">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onToggle}
          className="cursor-pointer lg:hidden p-2 text-slate-400 hover:text-blue-600 transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-xs hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-8">
        <NotificationBell />
        
        <Link to="/dashboard/profile" className="flex items-center gap-4 group cursor-pointer">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-gray-900 leading-tight">{user?.name}</p>
            <p className="text-[11px] text-blue-600 font-bold uppercase tracking-widest opacity-80">{user?.role}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-200 font-bold text-base border-2 border-white transform transition-transform group-hover:scale-105 overflow-hidden">
            {user?.image ? (
              <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0]
            )}
          </div>
        </Link>
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          className="cursor-pointer p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all ml-2"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[320px] p-6 border border-white animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Are you sure?</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">You will need to login again to access your dashboard.</p>
              </div>
              <div className="flex gap-2 w-full mt-2">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="cursor-pointer flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                >
                  Stay Here
                </button>
                <button 
                  onClick={logout}
                  className="cursor-pointer flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Yes, Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
