import React, { useState, useEffect } from 'react';
import { apiConnector } from '../../Services/apiConnector';
import { crmEndpoints } from '../../Services/apis';
import { Phone, Clock, Play, User as UserIcon, Calendar, Hash } from 'lucide-react';

export default function CallHistoryTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await apiConnector("GET", crmEndpoints.GET_CALL_HISTORY_API);
      if (res.data.success) setLogs(res.data.callLogs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const formatDuration = (s) => {
    if (!s) return '0s';
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="w-12 h-12 bg-slate-100 rounded-full mb-4"></div>
        <div className="h-4 w-32 bg-slate-100 rounded mb-2"></div>
        <div className="h-3 w-24 bg-slate-50 rounded"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-50 rounded-3xl p-6 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Calls</p>
          <p className="text-2xl font-black text-slate-800">{logs.length}</p>
        </div>
        <div className="bg-white border border-slate-50 rounded-3xl p-6 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Duration</p>
          <p className="text-2xl font-black text-slate-800">
            {formatDuration(logs.reduce((acc, l) => acc + (l.duration || 0), 0))}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden animate-in fade-in duration-500 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead / Number</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Recording</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.map(log => (
                <tr key={log._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                        {log.userId?.name?.[0] || 'U'}
                      </div>
                      <p className="text-xs font-bold text-slate-700">{log.userId?.name || 'Deleted User'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-700">{log.leadId?.name || '---'}</p>
                    <p className="text-[10px] text-slate-400 font-bold tracking-tight">{log.leadId?.contact || '---'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-700">{new Date(log.startTime || log.createdAt).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(log.startTime || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-700 font-mono tracking-tighter">{formatDuration(log.duration)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${
                      log.status?.toLowerCase() === 'completed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {log.recordingUrl ? (
                      <a 
                        href={log.recordingUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                      >
                        <Play className="w-3 h-3 fill-current" /> Play
                      </a>
                    ) : (
                      <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest italic">Wait for callback</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="py-24 text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mx-auto mb-4">
                  <Phone className="w-8 h-8" />
               </div>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic opacity-50">No call history recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
