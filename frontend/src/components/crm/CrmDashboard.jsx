import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCRMAnalytics } from '../../redux/slices/crmSlice';
import { 
    TrendingUp, FileText, CheckCircle, PieChart, Activity, DollarSign, Target, 
    User, BarChart, ChevronRight, Clock, ArrowUpRight 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function CrmDashboard() {
    const dispatch = useDispatch();
    const { analytics, loading } = useSelector(state => state.crm);

    useEffect(() => {
        dispatch(getCRMAnalytics());
    }, [dispatch]);

    if (loading || !analytics) {
        return (
            <div className="flex bg-slate-50 items-center justify-center p-20 min-h-[500px]">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    const { totalRevenue, expectedRevenue, funnel, totalLeads, convertedLeads, followUpsToday, recentActivities } = analytics;

    const stats = [
        { label: 'Total Revenue', value: `₹${(totalRevenue || 0).toLocaleString('en-IN')}`, icon: DollarSign, color: 'from-emerald-500 to-teal-600', sub: 'Closed Won' },
        { label: 'Pipeline Value', value: `₹${(expectedRevenue || 0).toLocaleString('en-IN')}`, icon: Target, color: 'from-blue-500 to-indigo-600', sub: 'Active Deals' },
        { label: 'Lead Growth', value: totalLeads, icon: User, color: 'from-violet-500 to-purple-600', sub: 'Total Leads' },
        { label: 'Win Rate', value: `${((convertedLeads/(totalLeads||1))*100).toFixed(1)}%`, icon: TrendingUp, color: 'from-amber-500 to-orange-600', sub: `${convertedLeads} Converted` },
    ];

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 bg-[#F8FAFC]">
            {/* Elegant Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                            <PieChart className="w-6 h-6 text-white" />
                        </div>
                        Command Center
                    </h1>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[3px] mt-2 ml-1">Real-time Pipeline Intelligence</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                    <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white rounded-xl shadow-lg">Overview</button>
                    <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Analytics</button>
                </div>
            </div>

            {/* Premium Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.label} 
                        className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden group"
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] -mr-8 -mt-8 rounded-full`} />
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                            </div>
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</h3>
                        <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200" /> {stat.sub}
                        </p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales Funnel - More Visual */}
                <div className="lg:col-span-1 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Revenue Funnel</h3>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><BarChart className="w-4 h-4" /></div>
                    </div>
                    <div className="flex flex-col items-center">
                        {Object.entries({
                            'Qualification': { count: funnel?.qualification || 0, color: 'bg-blue-500', w: '100%' },
                            'Proposal':      { count: funnel?.proposal || 0,      color: 'bg-indigo-500', w: '85%' },
                            'Negotiation':   { count: funnel?.negotiation || 0,    color: 'bg-violet-500', w: '70%' },
                            'Closed Won':    { count: funnel?.closedWon || 0,      color: 'bg-emerald-500', w: '55%' }
                        }).map(([stage, config], idx) => (
                            <div key={stage} className="w-full flex flex-col items-center mb-1">
                                <div className="w-full flex justify-between items-center mb-1.5 px-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">{stage}</span>
                                    <span className="text-[10px] font-black text-slate-900">{config.count}</span>
                                </div>
                                <div 
                                    className={`h-10 ${config.color} rounded-xl shadow-inner transition-all duration-1000 flex items-center justify-center group overflow-hidden relative`}
                                    style={{ width: config.w }}
                                >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="text-[10px] font-black text-white/40 tracking-widest hidden md:block">STAGE {idx + 1}</span>
                                </div>
                                {idx < 3 && <div className="w-0 h-4 border-l-2 border-slate-100 border-dashed my-1" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Feed and Follow Ups Container */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Activity Feed */}
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 opacity-20 -mr-16 -mt-16 rounded-full" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-8"><Activity className="w-4 h-4 text-blue-500" /> Recent Stream</h3>
                        <div className="space-y-6 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
                            {recentActivities?.map((act, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="flex flex-col items-center flex-shrink-0">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-all ${
                                            act.note.toLowerCase().includes('won') ? 'bg-emerald-50 text-emerald-600' : 
                                            act.note.toLowerCase().includes('created') ? 'bg-blue-50 text-blue-600' : 
                                            'bg-slate-50 text-slate-400'
                                        }`}>
                                            {act.note.toLowerCase().includes('won') ? <TrendingUp className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                                        </div>
                                        {i !== recentActivities.length - 1 && <div className="w-[1.5px] h-full bg-slate-50 mt-2" />}
                                    </div>
                                    <div className="pb-6">
                                        <p className="text-xs font-bold text-slate-700 leading-tight mb-1">{act.note}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                                            {act.name} • {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Items */}
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4 text-red-500" /> Action Items</h3>
                            <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full">{followUpsToday?.length || 0} Open</span>
                        </div>
                        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                            {followUpsToday?.length > 0 ? (
                                followUpsToday.map((fUp, i) => (
                                    <div key={i} className="p-4 bg-slate-50/50 hover:bg-white hover:border-blue-200 border border-transparent rounded-2xl transition-all group">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${fUp.type === 'Deal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{fUp.type}</span>
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                        <h4 className="text-xs font-black text-slate-800 mb-1">{fUp.item.name}</h4>
                                        <p className="text-[10px] text-slate-500 line-clamp-2 italic">"{fUp.item.followUpNote || fUp.item.notes || 'Routine follow-up needed'}"</p>
                                    </div>
                                ))
                            ) : (
                                <div className="h-48 flex flex-col items-center justify-center opacity-40">
                                    <CheckCircle className="w-10 h-10 mb-2 text-emerald-500" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Inbox Zero</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

