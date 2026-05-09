import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchCompanyDetails } from '../redux/slices/attendanceSlice';
import { fetchSubscriptionStatus } from '../redux/slices/subscriptionSlice';
import { 
  CreditCard, 
  CheckCircle2, 
  Zap, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  AlertTriangle,
  Receipt,
  Users,
  Calendar,
  IndianRupee
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const PlanFeature = ({ text }) => (
  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600">
    <div className="w-5 h-5 bg-blue-50 rounded-lg flex items-center justify-center">
       <CheckCircle2 className="w-3 h-3 text-blue-600" />
    </div>
    <span>{text}</span>
  </div>
);

const Subscription = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { companyDetails, loading: companyLoading } = useSelector(state => state.attendance);
  const { currentSubscription, loading: subLoading } = useSelector(state => state.subscription);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(fetchCompanyDetails());
    if (user?.companyId) {
      dispatch(fetchSubscriptionStatus(user.companyId));
    }
  }, [dispatch, user]);

  const plan = currentSubscription?.plan || companyDetails?.planId;
  const expiryDate = currentSubscription?.expiryDate ? new Date(currentSubscription.expiryDate) : null;
  const daysRemaining = currentSubscription?.remainingDays || 0;
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining <= 0 && currentSubscription?.expiryDate;

  const handleRenew = () => {
    navigate('/select-plan');
  };

  if (companyLoading || subLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100 pb-8">
        <div className="space-y-1">
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscription Management</h1>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user?.companyName || 'Corporate Workspace'}</p>
        </div>
        
        <div className="flex items-center gap-3">
           {expiryDate && (
             <div className={`px-5 py-2.5 rounded-2xl border flex flex-col items-center shadow-sm ${isExpiringSoon ? 'bg-red-50 border-red-100' : 'bg-slate-900 border-slate-800 text-white'}`}>
                <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${isExpiringSoon ? 'text-red-600' : 'text-slate-400'}`}>
                   {isExpiringSoon ? 'Expiring Soon' : 'Active Until'}
                </p>
                <p className="text-xs font-black">
                   {expiryDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
             </div>
           )}
        </div>
      </div>

      {isExpiringSoon && (
        <div className="bg-red-600 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-red-100">
           <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                 <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                 <h3 className="text-lg font-black leading-tight">Renewal Required</h3>
                 <p className="text-xs font-bold opacity-80">Your plan expires in {daysRemaining} days. Renew now to prevent interruption.</p>
              </div>
           </div>
           <button 
             onClick={handleRenew}
             className="cursor-pointer px-8 py-3 bg-white text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform"
           >
              Renew Workspace
           </button>
        </div>
      )}

      {isExpired && (
        <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
           <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center">
                 <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                 <h3 className="text-lg font-black leading-tight">Subscription Expired</h3>
                 <p className="text-xs font-bold opacity-60">Please upgrade to continue using your enterprise features.</p>
              </div>
           </div>
           <button 
             onClick={handleRenew}
             className="cursor-pointer px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-colors"
           >
              Upgrade Now
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                 <span className="bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-100">
                    {plan?.type === 'free' ? 'Trial Tier' : 'Pro Enterprise'}
                 </span>
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                {plan?.name || "No Active Plan"}
              </h3>
              <p className="text-sm text-slate-400 font-bold leading-relaxed max-w-md">
                Managing your organization with high-frequency API access and enterprise-grade security protocols.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-10 py-8 border-y border-slate-50">
               <PlanFeature text="Advanced CRM Pipeline" />
               <PlanFeature text="Manual Attendance Management" />
               <PlanFeature text="Dynamic Reporting Engine" />
               <PlanFeature text="Geofencing Verification" />
               <PlanFeature text="Priority Customer Support" />
               <PlanFeature text="Custom User Roles" />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-sm border border-slate-100">
                    <IndianRupee className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Cost</p>
                    <p className="text-xl font-black text-slate-900 font-mono">₹{plan?.price || '0'}<span className="text-[10px] font-bold text-slate-400 tracking-normal ml-1">/ {plan?.durationDays || '0'} Days</span></p>
                 </div>
              </div>
              <button 
                onClick={handleRenew}
                className="cursor-pointer w-full sm:w-auto px-10 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all"
              >
                 Switch Plan
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
              <div className="relative z-10">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md mb-6">
                    <Zap className="w-6 h-6 text-white" />
                 </div>
                 <h3 className="text-xl font-black mb-3 tracking-tight">Need more scale?</h3>
                 <p className="text-[11px] font-medium opacity-80 leading-relaxed mb-8">
                    Contact our sales team for custom quotas, dedicated account management, and bulk seat pricing for teams over 500.
                 </p>
                 <button className="cursor-pointer w-full bg-white text-blue-600 font-black text-[10px] py-4 rounded-xl uppercase tracking-widest hover:shadow-xl transition-all">
                    Contact Sales
                 </button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
           </div>

           <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                    <Receipt className="w-5 h-5" />
                 </div>
                 <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Recent Activity</h3>
              </div>
              <div className="space-y-5">
                 <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                       <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                       <p className="text-[11px] font-bold text-slate-700">Plan Activated</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">Today</span>
                 </div>
                 <div className="flex items-center justify-between group opacity-50">
                    <div className="flex items-center gap-3">
                       <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                       <p className="text-[11px] font-bold text-slate-700">Previous Expiry</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">Mar 15</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
