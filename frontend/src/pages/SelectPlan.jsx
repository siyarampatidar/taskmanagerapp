import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Zap, Shield, Crown, Star, IndianRupee } from 'lucide-react';
import { fetchPlans } from '../redux/slices/superAdminSlice';
import { activateFreePlan, fetchSubscriptionStatus } from '../redux/slices/subscriptionSlice';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const PlanCard = ({ plan, isFreeUsed, onSelect, selecting }) => {
  const isFree = plan.type === 'free';
  const isPopular = plan.billingCycle === 'yearly';

  // Don't show free plan if already used
  if (isFree && isFreeUsed) return null;

  return (
    <div className={`bg-white rounded-2xl p-8 border ${isPopular ? 'border-blue-600 ring-4 ring-blue-50 shadow-blue-100' : 'border-gray-100 shadow-sm'} flex flex-col transition-all hover:shadow-md relative`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
          Best Value
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
           {plan.billingCycle !== 'none' ? plan.billingCycle.replace('-', ' ') : 'Lifetime'} Cycle
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
          <span className="text-xs font-medium text-gray-400">/ {plan.durationDays} Days</span>
        </div>
      </div>

      <ul className="space-y-4 mb-10 flex-1">
        <li className="flex items-center gap-3 text-xs font-medium text-gray-600">
          <Check className="w-4 h-4 text-blue-600 shrink-0" />
          Up to {plan.maxUsers} Users Access
        </li>
        {plan.features?.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-3 text-xs font-medium text-gray-600">
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={selecting === plan._id}
        className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95 ${
          isPopular 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        }`}
      >
        {selecting === plan._id ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          isFree ? 'Get Started for Free' : 'Choose This Plan'
        )}
      </button>
    </div>
  );
};

const SelectPlan = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { plans, loading } = useSelector((state) => state.superAdmin);
  const { currentSubscription } = useSelector((state) => state.subscription);
  const { user } = useSelector((state) => state.auth);
  const [selecting, setSelecting] = useState(null);

  useEffect(() => {
    dispatch(fetchPlans());
    if (user?.companyId) {
      dispatch(fetchSubscriptionStatus(user.companyId));
    }
  }, [dispatch, user]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSelect = async (plan) => {
    if (plan.type === 'free') {
      setSelecting(plan._id);
      const res = await dispatch(activateFreePlan({ planId: plan._id, companyId: user.companyId }));
      if (activateFreePlan.fulfilled.match(res)) {
        toast.success("Trial plan activated successfully!");
        // We need to refresh user profile to get the new isActive status
        window.location.href = '/dashboard';
      } else {
        toast.error(res.payload?.message || "Activation failed");
      }
      setSelecting(null);
      return;
    }

    // Paid Plan - Razorpay Flow
    setSelecting(plan._id);
    const res = await loadRazorpayScript();
    if (!res) {
      toast.error("Payment system failed to load. Please try again.");
      setSelecting(null);
      return;
    }

    try {
      const token = localStorage.getItem('teamflow_token');
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const orderRes = await axios.post(`${apiBase}/subscriptions/create-order`, 
        { planId: plan._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { order } = orderRes.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_DXRt0G9MOWbJmf',
        amount: order.amount,
        currency: order.currency,
        name: "TeamFlow SaaS",
        description: `Upgrade to ${plan.name}`,
        order_id: order.id,
        handler: async (response) => {
          const verifyRes = await axios.post(`${apiBase}/subscriptions/verify-payment`, {
            ...response,
            planId: plan._id,
            companyId: user.companyId
          }, { headers: { Authorization: `Bearer ${token}` } });

          if (verifyRes.data.success) {
            toast.success("Payment confirmed! Welcome to the premium tier.");
            window.location.href = '/dashboard';
          } else {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not initiate payment");
    } finally {
      setSelecting(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Choose Your Power Plan</h1>
        <p className="text-sm text-gray-500 font-medium mt-3 max-w-lg mx-auto">
          Scale your team with enterprise-grade tools. No hidden fees, cancel anytime.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <PlanCard 
            key={plan._id} 
            plan={plan} 
            isFreeUsed={currentSubscription?.isFreeUsed || user.companyId?.isFreeUsed} 
            onSelect={handleSelect} 
            selecting={selecting} 
          />
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Securely Processed By</p>
        <div className="flex justify-center">
          <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay" className="h-5 grayscale opacity-60" />
        </div>
      </div>
    </div>
  );
};

export default SelectPlan;
