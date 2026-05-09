import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Clock, Info, AlertTriangle, CheckCircle, Target, Briefcase } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchNotifications, markAsRead } from '../../redux/slices/notificationSlice';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationBell = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, unreadCount, loading } = useSelector((state) => state.notifications);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notif) => {
    dispatch(markAsRead(notif._id));
    setIsOpen(false);
    
    // Logic to navigate based on referenceType
    if (notif.referenceType === 'Task') {
      navigate('/dashboard/tasks');
    } else if (notif.referenceType === 'Lead') {
      navigate('/dashboard/crm');
    } else if (notif.referenceType === 'Channel' || notif.referenceType === 'Message') {
      navigate('/dashboard/chat');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'task_assigned': return <Briefcase className="w-3.5 h-3.5 text-blue-500" />;
      case 'task_review': return <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />;
      case 'lead_assigned': return <Target className="w-3.5 h-3.5 text-green-500" />;
      case 'system_alert': return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
      default: return <Info className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all relative group"
      >
        <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full border-2 border-white min-w-[18px] flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden shadow-blue-900/10"
          >
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                Notifications
                {unreadCount > 0 && <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[9px]">{unreadCount} New</span>}
              </h3>
              <button 
                onClick={() => dispatch(markAsRead('all'))}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                Mark all as read
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
              {list.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium tracking-tight">Everything is up to date.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {list.map((notif) => (
                    <button
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full p-4 text-left hover:bg-blue-50/50 transition-colors flex gap-3 group relative ${!notif.isRead ? 'bg-blue-50/20' : ''}`}
                    >
                      {!notif.isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
                      )}
                      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${!notif.isRead ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'bg-slate-50'}`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-bold truncate ${!notif.isRead ? 'text-slate-900' : 'text-slate-500'}`}>
                          {notif.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed font-medium">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-[8.5px] font-bold text-slate-300 uppercase tracking-widest">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(notif.createdAt).toLocaleDateString() === new Date().toLocaleDateString() 
                             ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                             : new Date(notif.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-center">
              <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">
                View All Activity
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
