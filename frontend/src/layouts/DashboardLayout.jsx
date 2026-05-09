import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import { Menu, X } from 'lucide-react';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-inter scroll-smooth">
      {/* Sidebar with mobile state */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 transition-all duration-300">
        <Navbar onToggle={() => setIsSidebarOpen(true)} />
        
        <main className="p-6 sm:p-8 lg:p-12 flex-1 overflow-auto bg-white/50">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
