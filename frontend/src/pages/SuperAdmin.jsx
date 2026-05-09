import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Building2, 
  Plus, 
  Search, 
  Zap,
  ChevronRight,
  Target,
  LayoutDashboard,
  Users,
  Settings,
  CreditCard,
  XCircle,
  CheckCircle2,
  TrendingUp,
  Activity,
  IndianRupee,
  Star,
  Edit,
  Trash2,
  Clock
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchPlans, 
  fetchCompanies, 
  createPlan, 
  updatePlan, 
  deletePlan, 
  fetchStats, 
  toggleCompanyStatus 
} from '../redux/slices/superAdminSlice';
import { toast } from 'react-hot-toast';

const SuperAdmin = () => {
  const { subtab } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { plans, companies, stats, loading } = useSelector((state) => state.superAdmin);

  const [activeTab, setActiveTab] = useState(subtab || 'overview');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form, setForm] = useState({ 
    name: '', 
    price: '', 
    durationDays: 30, 
    maxUsers: 25, 
    features: '',
    type: 'paid',
    billingCycle: 'monthly'
  });

  useEffect(() => {
    const tab = subtab || 'overview';
    setActiveTab(tab);
    
    // Refresh data whenever tab changes
    if (tab === 'overview') dispatch(fetchStats());
    if (tab === 'plans') dispatch(fetchPlans());
    if (tab === 'companies') dispatch(fetchCompanies());
  }, [subtab, dispatch]);

  useEffect(() => {
    dispatch(fetchPlans());
    dispatch(fetchCompanies());
    dispatch(fetchStats());
  }, [dispatch]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setForm({ name: '', price: '', durationDays: 30, maxUsers: 25, features: '', type: 'paid', billingCycle: 'monthly' });
    setShowPlanModal(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setForm({ 
      name: plan.name, 
      price: plan.price, 
      durationDays: plan.durationDays, 
      maxUsers: plan.maxUsers, 
      features: plan.features?.join(', ') || '', 
      type: plan.type, 
      billingCycle: plan.billingCycle 
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    const features = form.features.split(',').map(f => f.trim()).filter(Boolean);
    const data = { ...form, features };

    if (editingPlan) {
      const result = await dispatch(updatePlan({ id: editingPlan._id, data }));
      if (updatePlan.fulfilled.match(result)) {
        toast.success('Plan Updated');
        setShowPlanModal(false);
      }
    } else {
      const result = await dispatch(createPlan(data));
      if (createPlan.fulfilled.match(result)) {
        toast.success('Plan Created');
        setShowPlanModal(false);
      }
    }
    dispatch(fetchStats());
  };

  const confirmDelete = async () => {
    if (!planToDelete) return;
    const result = await dispatch(deletePlan(planToDelete));
    if (deletePlan.fulfilled.match(result)) {
      toast.success('Plan Deleted');
      dispatch(fetchStats());
    }
    setShowConfirmModal(false);
    setPlanToDelete(null);
  };

  const handleDeleteClick = (id) => {
    setPlanToDelete(id);
    setShowConfirmModal(true);
  };

  const handleToggleStatus = async (id) => {
    const result = await dispatch(toggleCompanyStatus(id));
    if (toggleCompanyStatus.fulfilled.match(result)) {
      toast.success('Status Updated');
      dispatch(fetchStats());
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {activeTab === 'overview' ? 'Super Admin Dashboard' : activeTab === 'plans' ? 'Subscription Plans' : 'Manage Companies'}
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Control panel for managing SaaS plans and organizations.</p>
        </div>
        {activeTab === 'plans' && (
          <button 
            onClick={handleOpenCreate}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Create New Plan
          </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard icon={TrendingUp} label="Total Revenue" value={`₹${stats.totalRevenue?.toLocaleString()}`} />
            <StatCard icon={Building2} label="Companies" value={stats.totalCompanies} />
            <StatCard icon={Activity} label="Active Companies" value={stats.activeCompanies} />
            <StatCard icon={Target} label="Total Plans" value={stats.totalPlans} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-6">Recent Companies</h3>
              <div className="space-y-4">
                {companies.slice(0, 5).map(c => (
                  <div key={c._id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-50 hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {c.name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{c.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{c.planId?.name || 'No Plan'}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-6">Plan Distribution</h3>
              <div className="space-y-6">
                {plans.map(p => {
                  const count = companies.filter(c => c.planId?._id === p._id).length;
                  const percentage = (count / (companies.length || 1) * 100).toFixed(0);
                  return (
                    <div key={p._id} className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-500">
                        <span>{p.name}</span>
                        <span className="text-blue-600">{percentage}% ({count})</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan._id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all relative group">
              <div className="flex items-start justify-between mb-4">
                <div>
                   <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
                   <p className="text-2xl font-bold text-blue-600 mt-1">₹{plan.price}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenEdit(plan)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteClick(plan._id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{plan.durationDays} Days Validity</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  <Users className="w-4 h-4 text-gray-400" /> {plan.maxUsers} Users Limit
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  <Clock className="w-4 h-4 text-gray-400" /> {plan.billingCycle.toUpperCase()} Cycle
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {plan.type.toUpperCase()} Plan
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-gray-800">Company List</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="bg-gray-50 border border-gray-100 pl-10 pr-4 py-2 text-xs w-64 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Search company..." />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="px-4 py-4">Company</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Plan</th>
                  <th className="px-4 py-4">Expiry</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companies.map(c => (
                  <tr key={c._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
                          {c.name?.[0]}
                        </div>
                        <span className="text-sm font-bold text-gray-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${c.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {c.isActive ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-xs text-gray-600 font-medium uppercase">{c.planId?.name || 'No Plan'}</td>
                    <td className="px-4 py-5 text-xs text-gray-500 font-medium">{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-5 text-right">
                      <button 
                        onClick={() => handleToggleStatus(c._id)}
                        className={`p-2 rounded-lg ${c.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                      >
                        {c.isActive ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-gray-800">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
              <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleSavePlan} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Plan Name</label>
                <input className="w-full bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium" placeholder="e.g. Starter Pack" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Price (₹)</label>
                  <input className="w-full bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium" type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Max Users</label>
                  <input className="w-full bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium" type="number" value={form.maxUsers} onChange={e => setForm({...form, maxUsers: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Validity (Days)</label>
                  <input className="w-full bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium" type="number" value={form.durationDays} onChange={e => setForm({...form, durationDays: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Plan Type</label>
                  <select className="w-full bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="paid">Paid</option>
                    <option value="free">Free</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Billing Cycle</label>
                <select className="w-full bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-medium" value={form.billingCycle} onChange={e => setForm({...form, billingCycle: e.target.value})}>
                  <option value="monthly">Monthly</option>
                  <option value="half-yearly">Half Yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">Features (Comma Separated)</label>
                <textarea className="w-full bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 h-20" placeholder="CRM, Reports, Projects..." value={form.features} onChange={e => setForm({...form, features: e.target.value})} />
              </div>

              <div className="pt-2 shrink-0">
                <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95">
                  {editingPlan ? 'Update Plan' : 'Deploy Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Delete Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[1100] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Delete Plan?</h3>
            <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed">
              Are you sure you want to remove this plan? This action cannot be undone and may affect active subscriptions.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-md shadow-red-100 transition-all active:scale-95"
              >
                Delete Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
      <Icon className="w-5 h-5" />
    </div>
    <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
    <h3 className="text-xl font-bold text-gray-800 mt-1">{value}</h3>
  </div>
);

export default SuperAdmin;
