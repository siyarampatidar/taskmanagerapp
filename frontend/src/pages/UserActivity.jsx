import React, { useState, useEffect } from 'react';
import { apiConnector } from '../Services/apiConnector';
import { authEndpoints } from '../Services/apis';
import { Clock, User, LogIn, LogOut, Layout, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UserActivity() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await apiConnector("GET", authEndpoints.GET_USER_ACTIVITY_API);
      if (res.data.success) setSessions(res.data.sessions);
    } catch (err) { 
      toast.error("Failed to fetch activity logs");
      console.error(err); 
    }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 animate-pulse text-slate-300">
       <div className="w-16 h-16 bg-slate-50 rounded-3xl mb-4"></div>
       <div className="h-4 w-40 bg-slate-50 rounded"></div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2">Presence Report</h1>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" /> Comprehensive Login & Logout History
          </p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-[10px] font-black text-blue-600 uppercase tracking-widest">Activity Feed</div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-2xl shadow-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Team Member</th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Login Time</th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Logout Time</th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sessions.map(s => {
                const duration = s.logoutTime ? Math.floor((new Date(s.logoutTime) - new Date(s.loginTime)) / 60000) : null;
                return (
                  <tr key={s._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shadow-sm shadow-indigo-100 uppercase">
                          {s.userId?.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-tight">{s.userId?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.userId?.role || 'user'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2.5 text-emerald-600">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <LogIn className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-black tracking-tighter">{new Date(s.loginTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">{new Date(s.loginTime).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {s.logoutTime ? (
                        <div className="flex items-center gap-2.5 text-rose-600">
                          <div className="p-2 bg-rose-50 rounded-xl">
                             <LogOut className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-black tracking-tighter">{new Date(s.logoutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">{new Date(s.logoutTime).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse border border-blue-100">
                           <Layout className="w-3.5 h-3.5" /> Still Online
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-slate-600 font-mono tracking-tighter">
                        {duration !== null ? `${Math.floor(duration/60)}h ${duration%60}m` : '---'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-mono text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-lg inline-block border border-slate-100 uppercase">
                        {s.ipAddress || '0.0.0.0'}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sessions.length === 0 && (
            <div className="py-32 text-center text-slate-300 opacity-50 flex flex-col items-center">
               <Calendar className="w-12 h-12 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest">No activity history recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
