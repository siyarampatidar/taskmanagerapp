import { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, TrendingUp, Users, Building2, CheckCircle2, AlertCircle,
  DollarSign, Target, PieChart, Download, Calendar, Activity, 
  MapPin, Clock, Briefcase, ChevronRight, FileText, ArrowUpRight,
  FileSpreadsheet, File as PDFIcon, ChevronDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import 'jspdf-autotable';
import { toast } from 'react-hot-toast';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const StatCard = ({ title, value, subtext, icon: Icon, colorHex, trend }) => (
  <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-start justify-between mb-4">
      <div 
        className="p-2.5 rounded-xl bg-opacity-10 group-hover:scale-110 transition-transform"
        style={{ backgroundColor: `${colorHex}15` }}
      >
        <Icon className="w-5 h-5 shadow-sm" style={{ color: colorHex }} />
      </div>
      {trend && (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-[#bbf7d0] uppercase tracking-widest" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
          <ArrowUpRight className="w-2.5 h-2.5" /> {trend}
        </span>
      )}
    </div>
    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[1.5px] mb-1">{title}</h3>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-black text-slate-900 tracking-tight">{value}</span>
      <span className="text-[10px] font-bold text-slate-400">{subtext}</span>
    </div>
  </div>
);

const ProgressBar = ({ label, value, max, colorHex }) => {
  const percent = Math.min(100, Math.round((value / max) * 100)) || 0;
  return (
    <div className="space-y-2 text-left">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-900">{percent}%</span>
      </div>
      <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
        <div 
          className="h-full rounded-full transition-all duration-700 ease-out shadow-sm" 
          style={{ width: `${percent}%`, backgroundColor: colorHex }}
        />
      </div>
    </div>
  );
};

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef(null);

  const fetchStats = async () => {
    try {
      const res = await api.get('/reports/dashboard');
      if (res.data.success) {
        setStats(res.data.stats);
      } else {
        console.error('Reports API error:', res.data.message);
      }
    } catch (err) {
      console.error('Reports fetch error:', err?.response?.data || err.message);
      toast.error('Report data load nahi ho saka: ' + (err?.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleExcelExport = () => {
    if (!stats) return;
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Employees', stats.employees || 0],
        ['Total Departments', stats.departments || 0],
        ['Total Revenue (Closed Won)', stats.crm?.revenue || 0],
        ['Lead Conversion Rate (%)', stats.crm?.conversionRate || 0],
        ['Task Fulfillment (%)', stats.tasks?.completionRate || 0],
        ['Pending Leaves', stats.pendingLeaves || 0],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Overview Summary');

      if (stats.crm?.pipelineMap) {
        const crmData = Object.entries(stats.crm.pipelineMap).map(([stage, count]) => ({ Stage: stage.toUpperCase(), Leads: count }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(crmData), 'CRM Status');
      }

      if (stats.tasks?.chartData) {
        const tasksData = stats.tasks.chartData.map(t => ({ Status: t.name, Count: t.value }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksData), 'Tasks Breakdown');
      }

      XLSX.writeFile(wb, `Business_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel Report Generated!');
    } catch (err) {
      toast.error('Failed to export Excel');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handlePDFExport = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    setShowExportMenu(false);
    
    try {
      await new Promise(r => setTimeout(r, 200));
      const element = reportRef.current;
      const canvas = await html2canvas(element, { 
        scale: 1.5,
        useCORS: true, 
        backgroundColor: '#f8fafc',
        windowWidth: 1200,
        logging: false,
        onclone: (clonedDoc) => {
          // Remove all classes that might have oklch computed styles if they are problematic
          const noPrintElements = clonedDoc.querySelectorAll('.no-print');
          noPrintElements.forEach(el => el.remove());
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Intelligence_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Visual PDF Report Downloaded!');
    } catch (err) {
      console.error('PDF Catch Error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Analysing company data...</p>
    </div>
  );

  const isAdmin = ['admin', 'manager', 'hr'].includes(user?.role);

  return (
    <div className="space-y-8 animate-in fade-in duration-500" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: '#2563eb' }} />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Performance Analytics</h1>
          </div>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" style={{ color: '#2563eb' }} /> Real-time insights across your organization
          </p>
        </div>
        
        <div className="flex gap-3 relative">
          <button className="flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            <Calendar className="w-3.5 h-3.5" /> This Quarter
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`btn-primary flex items-center gap-3 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-all ${isExporting ? 'opacity-70 pointer-events-none' : ''}`}
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} /> 
              {isExporting ? 'Generating...' : 'Export Intelligence'}
              <ChevronDown className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-[50] py-2 animate-in slide-in-from-top-2 duration-200">
                <button 
                   onClick={handleExcelExport}
                   className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#10b981]" />
                  Download Excel (.xlsx)
                </button>
                <button 
                   onClick={handlePDFExport}
                   className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                >
                  <PDFIcon className="w-4 h-4 text-[#f43f5e]" />
                  Download PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-2xl w-fit border border-slate-100 no-print">
        {['Overview', 'HR & Attendance', 'CRM Analytics', 'Tasks'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab 
              ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {stats && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          {/* TAB: OVERVIEW */}
          {activeTab === 'Overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isAdmin ? (
                  <>
                    <StatCard title="Workforce" value={stats.employees || 0} subtext="Active staff" icon={Users} colorHex="#2563eb" trend="12%" />
                    <StatCard title="Infrastructure" value={stats.departments || 0} subtext="Departments" icon={Building2} colorHex="#8b5cf6" />
                    <StatCard title="Est. Revenue" value={`₹${(stats.crm?.revenue || 0).toLocaleString()}`} subtext="Total deals" icon={DollarSign} colorHex="#10b981" trend="8.4%" />
                    <StatCard title="Absences" value={stats.pendingLeaves || 0} subtext="Pending Leaves" icon={AlertCircle} colorHex="#f43f5e" />
                  </>
                ) : (
                  <>
                    <StatCard title="My Workload" value={stats.personalTasks?.total || 0} subtext="Active tasks" icon={Briefcase} colorHex="#2563eb" />
                    <StatCard title="Avg Efficiency" value={`${Math.round((stats.personalTasks?.completed / stats.personalTasks?.total) * 100) || 0}%`} subtext="Completion rate" icon={CheckCircle2} colorHex="#10b981" />
                    <StatCard title="Active Pipeline" value={stats.personalLeads?.total || 0} subtext="Leads managed" icon={Target} colorHex="#f59e0b" />
                    <StatCard title="Converted" value={stats.personalLeads?.converted || 0} subtext="Leads won" icon={TrendingUp} colorHex="#6366f1" />
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm overflow-hidden relative">
                   <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Growth Intelligence</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Monthly Deal Revenue Trend (Last 12m)</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2563eb' }} />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Revenue</span>
                        </div>
                      </div>
                   </div>
                   <div className="h-[280px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.crm?.revenueTrend || []}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                            dy={10}
                            tickFormatter={(m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                            tickFormatter={(val) => `₹${val >= 1000 ? val/1000 + 'k' : val}`}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', fontStyle: 'Inter' }}
                            itemStyle={{ fontSize: '11px', fontWeight: 700 }}
                          />
                          <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                   <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Efficiency Snapshot</h3>
                    <div className="space-y-8">
                       <ProgressBar label="Task Fulfillment" value={stats.tasks?.completed || 0} max={stats.tasks?.total || 1} colorHex="#2563eb" />
                       <ProgressBar label="Lead Conversion" value={stats.crm?.convertedLeads || 0} max={stats.crm?.totalLeads || 1} colorHex="#10b981" />
                       <ProgressBar label="Leaves Pending" value={stats.pendingLeaves || 0} max={stats.employees || 50} colorHex="#f59e0b" />
                    </div>
                   </div>
                   <div className="mt-8 rounded-2xl p-4 border border-blue-100" style={{ backgroundColor: '#eff6ff' }}>
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" /> Overall Health
                      </p>
                      <p className="text-[10px] text-blue-500 font-bold tracking-tight">System performance is exceptional. 92% SLA compliance achieved today.</p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HR & ATTENDANCE */}
          {activeTab === 'HR & Attendance' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Attendance Distribution</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={stats.hr?.deptDistribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.hr?.deptDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {stats.hr?.deptDistribution.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100" style={{ backgroundColor: '#f8fafc' }}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate flex-1">{d.name}</span>
                      <span className="text-[11px] font-black text-slate-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Leave Status Tracking</h3>
                <div className="overflow-hidden border border-slate-50 rounded-2xl">
                   <table className="w-full text-left border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lease Status</th>
                          <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {stats.hr?.leavesByStatus?.map((l, i) => (
                          <tr key={i}>
                            <td className="px-5 py-3">
                              <span 
                                className="text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest"
                                style={{
                                  backgroundColor: l.name === 'approved' ? '#f0fdf4' : l.name === 'pending' ? '#fffbeb' : '#fef2f2',
                                  color: l.name === 'approved' ? '#166534' : l.name === 'pending' ? '#92400e' : '#991b1b',
                                  borderColor: l.name === 'approved' ? '#bbf7d0' : l.name === 'pending' ? '#fde68a' : '#fecaca'
                                }}
                              >
                                {l.name}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-black text-slate-700">{l.value}</td>
                          </tr>
                        )) || (
                          <tr><td colSpan="2" className="p-8 text-center text-xs text-slate-400 italic">No leave data available</td></tr>
                        )}
                      </tbody>
                   </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CRM ANALYTICS */}
          {activeTab === 'CRM Analytics' && (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
               <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Sales Funnel Insights</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lead tracking from capture to conversion</p>
                  </div>
                  <Target className="w-6 h-6 text-slate-200" />
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {Object.entries(stats.crm?.pipelineMap || {}).map(([stage, count], i) => (
                    <div key={stage} className="relative flex flex-col items-center">
                       <div 
                        className="w-16 h-16 rounded-3xl border border-slate-100 flex items-center justify-center font-black text-lg mb-3 shadow-inner"
                        style={{ color: '#2563eb', backgroundColor: '#f8fafc' }}
                       >
                          {count}
                       </div>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-[1px] mb-1 text-center">{stage}</span>
                       <div className="w-full h-1 rounded-full mt-2 overflow-hidden shadow-inner" style={{ backgroundColor: '#f1f5f9' }}>
                          <div 
                            className="h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (count/(stats.crm?.totalLeads||1))*100)}%`, backgroundColor: '#2563eb' }} 
                          />
                       </div>
                       {i < 4 && <ChevronRight className="hidden md:block absolute -right-3 top-6 w-6 h-6 text-slate-100" />}
                    </div>
                  ))}
               </div>

               <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="rounded-3xl p-6 border border-[#bbf7d0]" style={{ backgroundColor: '#f0fdf4' }}>
                    <h4 className="text-[11px] font-black text-[#166534] uppercase tracking-[2px] mb-4">Conversion Success</h4>
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-black text-[#14532d] tracking-tight">{stats.crm?.conversionRate}%</span>
                      <span className="text-[11px] font-bold text-[#166534] mb-1">Win Probability Rate</span>
                    </div>
                  </div>
                  <div className="rounded-3xl p-6 border border-[#ddd6fe]" style={{ backgroundColor: '#f5f3ff' }}>
                    <h4 className="text-[11px] font-black text-[#5b21b6] uppercase tracking-[2px] mb-4">Total Realized Value</h4>
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-black text-[#4c1d95] tracking-tight">₹{Math.round(stats.crm?.revenue/1000)}k</span>
                      <span className="text-[11px] font-bold text-[#5b21b6] mb-1">Total Pipeline Output</span>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {/* TAB: TASKS */}
          {activeTab === 'Tasks' && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm lg:col-span-2">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4 flex items-center justify-between">
                       Target Intelligence
                       <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-[#dbeafe]" style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}>Live Mission Tracking</span>
                    </h3>
                    <div className="overflow-x-auto">
                       <table className="w-full text-left border-collapse">
                          <thead>
                            <tr style={{ backgroundColor: '#f8fafc' }}>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Missions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {stats.tasks?.chartData?.map((t, i) => (
                              <tr key={i}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-black text-slate-700">{t.value}</td>
                              </tr>
                            ))}
                          </tbody>
                       </table>
                    </div>
                  </div>

                  <div className="rounded-3xl p-6 shadow-xl shadow-blue-100 text-white overflow-hidden relative group" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)' }}>
                     <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-20 h-20" />
                     </div>
                     <h3 className="text-[11px] font-black text-blue-100 uppercase tracking-[2px] mb-8 relative z-10">Mission Completion</h3>
                     <div className="text-5xl font-black mb-2 relative z-10 tracking-tight">{stats.tasks?.completionRate}%</div>
                     <p className="text-[10px] font-bold text-blue-100 opacity-90 uppercase tracking-widest relative z-10">Quarterly Target Achieved</p>
                     
                     <div className="mt-12 space-y-4 relative z-10">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest p-3 rounded-2xl border border-white/20 backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                           <span className="text-white/80">Total Assigned</span>
                           <span className="text-white">{stats.tasks?.total}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest p-3 rounded-2xl border border-white/20 backdrop-blur-sm" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                           <span className="text-white/80">Successfully Finished</span>
                           <span className="text-white font-black">{stats.tasks?.completed}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
