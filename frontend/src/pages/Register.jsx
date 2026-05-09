import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building, User, Mail, Lock, Loader2, Rocket, Eye, EyeOff } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError } from '../redux/slices/authSlice';
import { toast } from 'react-hot-toast';

const validateEmail = (email) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

const Register = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [inlineErrors, setInlineErrors] = useState({});
  
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!formData.companyName) errors.companyName = 'Company Name is required';
    if (!formData.ownerName) errors.ownerName = 'Owner Name is required';
    if (!formData.email) errors.email = 'Email is required';
    else if (!validateEmail(formData.email)) errors.email = 'Please enter a valid business email';
    else if (formData.email !== formData.email.toLowerCase()) {
      toast.error('Email must be in lowercase');
      return;
    }
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';

    if (Object.keys(errors).length > 0) {
      setInlineErrors(errors);
      return;
    }

    setInlineErrors({});

    const resultAction = await dispatch(register({
      ...formData,
      email: formData.email.toLowerCase()
    }));
    
    if (register.fulfilled.match(resultAction)) {
      toast.success('Registration successful!');
      navigate('/select-plan');
    } else if (register.rejected.match(resultAction)) {
      toast.error(resultAction.payload || 'Registration failed');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (inlineErrors[e.target.name]) {
      setInlineErrors({ ...inlineErrors, [e.target.name]: null });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decals */}
      <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-50 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10 relative z-10">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto mb-6 shadow-lg shadow-blue-100">TF</div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">Create Your Company</h1>
          <p className="text-gray-400 text-[13px] font-medium mt-2">Start your 14-day free team trial</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Company Name</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 group-focus-within:text-blue-600 transition-colors pointer-events-none z-10">
                <Building className="w-4 h-4" />
              </div>
              <input
                name="companyName"
                type="text"
                required
                className={`w-full h-11 pl-11 pr-4 rounded-xl border ${inlineErrors.companyName ? 'border-red-500 bg-red-50/10' : 'border-gray-200 bg-gray-50/50'} focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm font-semibold`}
                placeholder="Acme Corp"
                onChange={handleChange}
              />
            </div>
            {inlineErrors.companyName && <p className="mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">{inlineErrors.companyName}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Your Name</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 group-focus-within:text-blue-600 transition-colors pointer-events-none z-10">
                <User className="w-4 h-4" />
              </div>
              <input
                name="ownerName"
                type="text"
                required
                className={`w-full h-11 pl-11 pr-4 rounded-xl border ${inlineErrors.ownerName ? 'border-red-500 bg-red-50/10' : 'border-gray-200 bg-gray-50/50'} focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm font-semibold`}
                placeholder="John Doe"
                onChange={handleChange}
              />
            </div>
            {inlineErrors.ownerName && <p className="mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">{inlineErrors.ownerName}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Business Email</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 group-focus-within:text-blue-600 transition-colors pointer-events-none z-10">
                <Mail className="w-4 h-4" />
              </div>
              <input
                name="email"
                type="email"
                required
                className={`w-full h-11 pl-11 pr-4 rounded-xl border ${inlineErrors.email ? 'border-red-500 bg-red-50/10' : 'border-gray-200 bg-gray-50/50'} focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm font-semibold`}
                placeholder="john@acme.com"
                onChange={handleChange}
              />
            </div>
            {inlineErrors.email && <p className="mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">{inlineErrors.email}</p>}
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 group-focus-within:text-blue-600 transition-colors pointer-events-none z-10">
                <Lock className="w-4 h-4" />
              </div>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className={`w-full h-11 pl-11 pr-12 rounded-xl border ${inlineErrors.password ? 'border-red-500 bg-red-50/10' : 'border-gray-200 bg-gray-50/50'} focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm font-semibold`}
                placeholder="••••••••"
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all z-10"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {inlineErrors.password && <p className="mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">{inlineErrors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all mt-4 shadow-lg shadow-blue-100 active:scale-[0.98] disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Launch Company Dashboard</span>
                <Rocket className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-gray-500 text-xs">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
              Login Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
