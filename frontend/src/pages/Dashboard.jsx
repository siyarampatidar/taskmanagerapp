import { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  Briefcase,
  MessageSquare,
  Settings,
  Calendar,
  AlertCircle,
  FileText,
  MousePointer2,
  Bell
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '../redux/slices/reportSlice';
import { fetchSubscriptionStatus } from '../redux/slices/subscriptionSlice';
import ExpiryAlertModal from '../components/subscription/ExpiryAlertModal';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'framer-motion';
import { DashboardSkeleton } from '../components/common/Skeleton';

const COLORS = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StatCard = ({ icon: Icon, label, value, trend, colorClass = "text-blue-600 bg-blue-50" }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-100 flex items-start justify-between group shadow-sm hover:shadow-md transition-all">
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight">
        {value ?? '0'}
      </h3>
      {trend && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded-md">+{trend}%</span>
          <span className="text-[9px] text-slate-400 font-medium">vs last month</span>
        </div>
      )}
    </div>
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 ${colorClass}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, color, onClick }) => (
  <button 
    onClick={onClick}
    className="flex-1 min-w-[140px] flex flex-col items-center gap-2 p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-600 hover:shadow-lg hover:shadow-blue-50 transition-all group cursor-pointer"
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${color} group-hover:bg-blue-600 group-hover:text-white`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600 uppercase tracking-tight">{label}</span>
  </button>
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const { stats, loading } = useSelector((state) => state.reports);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('all'); // all, today, week, month
  const { currentSubscription } = useSelector(state => state.subscription);
  const [showExpiryModal, setShowExpiryModal] = useState(false);

  useEffect(() => {
    if (user?.role === 'superadmin') {
      navigate('/dashboard/superadmin');
      return;
    }
    dispatch(fetchDashboardStats(period === 'all' ? null : period));
    if (user?.role === 'admin' && user?.companyId) {
      dispatch(fetchSubscriptionStatus(user.companyId));
    }
  }, [dispatch, period, user, navigate]);

  useEffect(() => {
    if (user?.role === 'admin' && currentSubscription?.remainingDays <= 7 && currentSubscription?.remainingDays >= 0) {
      const today = new Date().toDateString();
      const lastShown = localStorage.getItem('subscriptionAlertShown');
      if (lastShown !== today) {
        setShowExpiryModal(true);
      }
    }
  }, [currentSubscription, user]);

  const handleCloseExpiryModal = () => {
    setShowExpiryModal(false);
    localStorage.setItem('subscriptionAlertShown', new Date().toDateString());
  };

  if (loading) return <DashboardSkeleton />;

  const role = user?.role?.toLowerCase();
  const isAdmin = role === 'admin';
  const isHR = role === 'hr';
  const isManager = role === 'manager'; // Now Global
  const isTeamHead = role === 'teamhead'; // Now Departmental

  const isGlobalView = isAdmin || isManager || isHR;

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  // Transform revenue trend data for chart
  const revenueData = stats?.crm?.revenueTrend?.map(item => ({
    name: MONTHS[item.month - 1] || 'Jan',
    total: item.total
  })) || [];

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-10"
    >
      {showExpiryModal && (
        <ExpiryAlertModal 
          daysRemaining={currentSubscription?.remainingDays} 
          onClose={handleCloseExpiryModal} 
        />
      )}
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Hello, {user?.name.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-tight">
            Dashboard Overview &bull; {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                {[
                  { label: 'Today', val: 'today' },
                  { label: 'Week', val: 'week' },
                  { label: 'Month', val: 'month' },
                  { label: 'All', val: 'all' }
                ].map((p) => (
                  <button
                    key={p.val}
                    onClick={() => setPeriod(p.val)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      period === p.val 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
            </div>

            <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role:</span>
                <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-lg">{user?.role}</span>
            </div>
        </div>
      </div>

      {/* ── STATS SECTION ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isGlobalView ? (
          <>
            <StatCard 
              icon={TrendingUp} 
              label="Total Revenue" 
              value={stats?.crm?.revenue ? `₹${(stats.crm.revenue/100000).toFixed(1)}L` : '₹0'} 
              colorClass="text-blue-600 bg-blue-50"
            />
            <StatCard 
              icon={Target} 
              label="Active Leads" 
              value={stats?.crm?.totalLeads} 
              colorClass="text-emerald-600 bg-emerald-50"
            />
            <StatCard 
              icon={CheckCircle2} 
              label="Tasks Completed" 
              value={stats?.tasks?.completed} 
              colorClass="text-amber-600 bg-amber-50"
            />
            <StatCard 
              icon={Users} 
              label="Team Members" 
              value={stats?.employees} 
              colorClass="text-violet-600 bg-violet-50"
            />
          </>
        ) : (
          <>
            <StatCard 
              icon={Clock} 
              label="Today's Status" 
              value={stats?.attendance?.checkIn || 'No Check-in'} 
              colorClass="text-emerald-600 bg-emerald-50"
            />
            <StatCard 
              icon={CheckCircle2} 
              label="My Completed" 
              value={stats?.personalTasks?.completed} 
              colorClass="text-blue-600 bg-blue-50"
            />
            <StatCard 
              icon={AlertCircle} 
              label="Action Items" 
              value={stats?.personalTasks?.pending} 
              colorClass="text-amber-600 bg-amber-50"
            />
            <div className="bg-indigo-600 p-5 rounded-xl flex flex-col justify-between shadow-lg shadow-indigo-100">
               <div>
                  <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest">Work Identity</p>
                  <h4 className="text-white text-sm font-black mt-1 truncate">{user?.departmentId?.name || 'Operations'}</h4>
               </div>
               <div className="flex items-center justify-between mt-2">
                  <p className="text-[8px] font-bold text-indigo-100 uppercase">Head: {user?.reportingTo?.name?.split(' ')[0] || 'Admin'}</p>
                  <Briefcase className="w-4 h-4 text-white/20" />
               </div>
            </div>
          </>
        )}
      </motion.div>

      {/* ── MAIN ANALYTICS SECTION ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
                <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                   <TrendingUp className="w-3 h-3 text-blue-600" /> Monthly Revenue
                </h2>
                <p className="text-[10px] text-slate-400 font-medium">Earnings trend for the year</p>
            </div>
            <div className="flex gap-1">
               {['6M', '1Y'].map(t => <span key={t} className={`px-2 py-0.5 text-[9px] font-bold rounded ${t==='1Y'?'bg-blue-50 text-blue-600':'text-slate-400'}`}>{t}</span>)}
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={revenueData.length > 0 ? revenueData : [ {name: 'Jan', total: 4000}, {name: 'Feb', total: 3000}, {name: 'Mar', total: 5000} ]}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} hide />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }} 
                  />
                  <Bar dataKey="total" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={24} />
               </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Activity Feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Bell className="w-3 h-3 text-indigo-600" /> Team Activity
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">Real-time organizational updates</p>
            </div>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
             {stats?.recentActivity?.length > 0 ? (
               stats.recentActivity.map((activity, i) => (
                 <div key={i} className="flex items-start gap-4 group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shadow-sm flex-shrink-0" style={{background: activity.color}}>
                       {activity.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[12px] text-slate-700 font-medium leading-tight group-hover:text-slate-900 transition-colors">
                          {activity.text}
                       </p>
                       <span className="text-[10px] text-slate-400 font-bold">{new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                 </div>
               ))
             ) : (
               <div className="flex flex-col items-center justify-center py-10 opacity-40">
                  <Clock className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No recent activity</p>
               </div>
             )}
          </div>
        </div>
      </motion.div>

      {/* ── TODAY'S MISSIONS & PIPELINE SNAPSHOT ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Today's Tasks */}
         <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-bottom border-slate-50 flex items-center justify-between">
               <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Today's Missions
               </h2>
               <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                  {stats?.tasks?.todayMissions?.length || 0} Urgent
               </span>
            </div>
            <div className="divide-y divide-slate-50">
               {stats?.tasks?.todayMissions?.length > 0 ? (
                 stats.tasks.todayMissions.map((mission, i) => (
                   <div key={i} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${mission.priority === 'high' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-amber-500'}`} />
                      <div className="flex-1 min-w-0">
                         <h4 className="text-[13px] font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{mission.title}</h4>
                         <p className="text-[10px] text-slate-400 font-medium">Due {mission.due} &bull; {mission.priority} Priority</p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 border border-white shadow-sm">
                         {mission.initials}
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="p-10 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Missions Due Today</p>
                 </div>
               )}
            </div>
         </div>

         {/* Pipeline Snapshot */}
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <MousePointer2 className="w-3 h-3 text-blue-600" /> Pipeline Snapshot
               </h2>
               <button className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:gap-2 transition-all" onClick={() => navigate('/dashboard/crm')}>
                  View All <ArrowRight className="w-3 h-3" />
               </button>
            </div>
            <div className="space-y-5">
               {['New Lead', 'Contacted', 'Proposal', 'Won', 'Lost'].map((label, i) => {
                 const count = stats?.crm?.pipelineMap?.[label] || 0;
                 const total = stats?.crm?.totalLeads || 1;
                 const percentage = Math.max(5, (count / total) * 100);
                 const barColors = ['#4F46E5', '#06B6D4', '#F59E0B', '#22C55E', '#EF4444'];
                 return (
                   <div key={label}>
                     <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{label}</span>
                        <span className="text-[10px] font-black text-slate-400">{count} leads</span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full rounded-full" 
                          style={{ background: barColors[i] }} 
                        />
                     </div>
                   </div>
                 );
               })}
            </div>
         </div>
      </motion.div>

      {/* ── QUICK SHORTCUTS ── */}
      <motion.div variants={itemVariants} className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Global Command Center</h2>
            <div className="h-[1px] flex-1 bg-slate-100 mx-4" />
        </div>
        <div className="flex flex-wrap gap-4">
          {(isAdmin || isHR) && (
            <QuickAction icon={Users} label="Team Management" color="text-emerald-600 bg-emerald-50" onClick={() => navigate('/dashboard/hrm')} />
          )}
          {(isGlobalView) && (
            <QuickAction icon={TrendingUp} label="Reports & Insights" color="text-violet-600 bg-violet-50" onClick={() => navigate('/dashboard/reports')} />
          )}
          <QuickAction icon={Briefcase} label="Sales Pipeline" color="text-blue-600 bg-blue-50" onClick={() => navigate('/dashboard/crm')} />
          <QuickAction icon={CheckCircle2} label="Mission Board" color="text-indigo-600 bg-indigo-50" onClick={() => navigate('/dashboard/tasks')} />
          <QuickAction icon={MessageSquare} label="Internal Chat" color="text-slate-600 bg-slate-50" onClick={() => navigate('/dashboard/chat')} />
          {(isAdmin) && (
            <QuickAction icon={Settings} label="System Config" color="text-slate-600 bg-slate-50" onClick={() => navigate('/dashboard/settings')} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
