import React, { useState } from 'react';
import { Mail, ChevronLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../redux/slices/authSlice';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email !== email.toLowerCase()) {
      toast.error('Email must be in lowercase');
      return;
    }
    try {
      await dispatch(forgotPassword(email.toLowerCase())).unwrap();
      setSent(true);
      toast.success('Reset link sent to your email!');
    } catch (err) {
      toast.error(err || 'Failed to send reset link');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-[120px] -mr-64 -mt-64 opacity-60" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-50 rounded-full blur-[120px] -ml-64 -mb-64 opacity-60" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100/50 border border-white p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-indigo-600 shadow-inner">
            {sent ? <ShieldCheck className="w-10 h-10 animate-bounce" /> : <Mail className="w-10 h-10" />}
          </div>

          {!sent ? (
            <>
              <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Forgot Access?</h1>
              <p className="text-slate-400 font-bold text-sm mb-10 leading-relaxed uppercase tracking-wider">
                Enter your verified email address to securely reset your TeamFlow credentials.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="email"
                      className="w-full pl-14 pr-5 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-300"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (
                    <>
                      Generate Reset Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="animate-in fade-in zoom-in duration-500">
              <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Link Dispatched!</h1>
              <p className="text-slate-400 font-bold text-sm mb-10 leading-relaxed uppercase tracking-wider">
                Check your inbox (and server console) for the secure access link to reset your password.
              </p>
              <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 mb-10">
                <p className="text-[10px] font-black text-indigo-600 leading-relaxed uppercase tracking-widest">
                  The link will expire in 60 minutes for your security.
                </p>
              </div>
            </div>
          )}

          <Link
            to="/login"
            className="mt-10 inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
