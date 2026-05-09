import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Shield, Camera, Lock, Eye, EyeOff,
  CheckCircle2, AlertCircle, Briefcase, Calendar, Building,
  Globe, FileText, MapPin, Tag, Monitor, LogOut, Clock, Hash
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, changePassword, updateCompanyDetails, getUserProfile } from '../redux/slices/authSlice';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { loading } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: '', phone: '', gender: '', image: '', designation: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '', newPassword: '', confirmPassword: ''
  });
  const [companyForm, setCompanyForm] = useState({
    name: '', companyEmail: '', gstNumber: '', website: '', address: ''
  });

  useEffect(() => {
    dispatch(getUserProfile());
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        gender: user.gender || '',
        image: user.image || '',
        designation: user.designation || ''
      });
      if (user.companyId) {
        setCompanyForm({
          name: user.companyId.name || '',
          companyEmail: user.companyId.companyEmail || '',
          gstNumber: user.companyId.gstNumber || '',
          website: user.companyId.website || '',
          address: user.companyId.address || ''
        });
      }
    }
  }, [user]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error('File too large (max 1MB)'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm(prev => ({ ...prev, image: reader.result }));
      dispatch(updateProfile({ ...profileForm, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateProfile(profileForm)).unwrap();
      toast.success('Profile updated!');
      setIsEditing(false);
    } catch (err) { toast.error(err || 'Failed to update profile'); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) { toast.error('Minimum 6 characters required'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    try {
      await dispatch(changePassword({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword })).unwrap();
      toast.success('Password updated!');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err || 'Failed to change password'); }
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateCompanyDetails(companyForm)).unwrap();
      toast.success('Company details updated!');
    } catch (err) { toast.error(err || 'Failed to update company'); }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const tabs = [
    { id: 'personal', label: 'Profile details', icon: User },
    { id: 'work', label: 'Work info', icon: Briefcase },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">

      {/* ── Header Card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-indigo-50 border-2 border-white shadow ring-2 ring-slate-100 flex items-center justify-center overflow-hidden">
              {profileForm.image
                ? <img src={profileForm.image} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-2xl font-semibold text-indigo-600">{initials}</span>}
            </div>
            <label className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center cursor-pointer hover:bg-indigo-700 transition-colors">
              <Camera className="w-3.5 h-3.5 text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>

          {/* Name / meta */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-xl font-semibold text-slate-900">{user?.name || '—'}</h1>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100">
                {user?.role}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            </div>
            <p className="text-sm text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 mb-3">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {user?.email}
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-slate-400" />{user?.companyId?.name || '—'}</span>
              <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-slate-400" />{user?.designation || 'Member'}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { icon: User, label: 'Department', value: user?.departmentId?.name || '—' },
            { icon: User, label: 'Reporting Manager', value: user?.reportingTo?.name || 'Admin / Owner' },
            { icon: Hash, label: 'Employee ID', value: user?.employeeId || 'EMP-001' },
            { icon: Clock, label: 'Last login', value: 'Today' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Icon className="w-3 h-3" /> {label}
              </p>
              <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-5 flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── General Information Tab ── */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Identity & Workspace</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Your personal and professional context</p>
            </div>
            {!isEditing
              ? <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-100 transition-colors">Edit Details</button>
              : <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors">Cancel</button>
            }
          </div>

          {isEditing ? (
            <div className="space-y-10">
              {/* Personal Section */}
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Personal Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full name" icon={User}>
                    <input className={inputCls} value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} required />
                  </Field>
                  <Field label="Contact Number" icon={Phone}>
                    <input className={inputCls} value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                  </Field>
                  <Field label="Gender" icon={User}>
                    <select className={inputCls} value={profileForm.gender} onChange={e => setProfileForm(p => ({ ...p, gender: e.target.value }))}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Field label="Designation" icon={Briefcase}>
                    <input className={inputCls} value={profileForm.designation} onChange={e => setProfileForm(p => ({ ...p, designation: e.target.value }))} readOnly={user?.role !== 'admin'} />
                  </Field>
                </div>
                <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
                  Save Identity
                </button>
              </form>

              {/* Company Section (Admin Only) */}
              {user?.role === 'admin' && (
                <div className="pt-8 border-t border-slate-50">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Workspace Details</h3>
                   <form onSubmit={handleUpdateCompany} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Company Name" icon={Building}>
                        <input className={inputCls} value={companyForm.name} onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))} required />
                      </Field>
                      <Field label="Official Company Email" icon={Mail}>
                        <input type="email" className={inputCls} value={companyForm.companyEmail} onChange={e => setCompanyForm(p => ({ ...p, companyEmail: e.target.value }))} />
                      </Field>
                      <Field label="GST Registration" icon={FileText}>
                        <input className={inputCls} value={companyForm.gstNumber} onChange={e => setCompanyForm(p => ({ ...p, gstNumber: e.target.value }))} />
                      </Field>
                      <Field label="Official Website" icon={Globe}>
                        <input className={inputCls} value={companyForm.website} onChange={e => setCompanyForm(p => ({ ...p, website: e.target.value }))} />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="Headquarters Address" icon={MapPin}>
                          <textarea className={`${inputCls} h-20 resize-none`} value={companyForm.address} onChange={e => setCompanyForm(p => ({ ...p, address: e.target.value }))} />
                        </Field>
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors shadow-xl shadow-slate-100">
                      Save Workspace
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-10">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { label: 'Full name', icon: User, value: user?.name },
                    { label: 'Login Email', icon: Mail, value: user?.email },
                    { label: 'Personal Phone', icon: Phone, value: user?.phone || 'Not provided' },
                    { label: 'Gender', icon: User, value: user?.gender || 'Not specified' },
                    { label: 'Current Designation', icon: Briefcase, value: user?.designation || 'Member' },
                    { label: 'Employer Company', icon: Building, value: user?.companyId?.name || '—' },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <item.icon className="w-3 h-3" /> {item.label}
                      </p>
                      <p className="text-sm font-bold text-slate-700">{item.value}</p>
                    </div>
                  ))}
               </div>

               <div className="pt-8 border-t border-slate-50">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Workspace Details</h3>
                  <InfoGrid items={[
                    { label: 'Company Official Email', icon: Mail, value: user?.companyId?.companyEmail || '—' },
                    { label: 'GST Number', icon: FileText, value: user?.companyId?.gstNumber || '—' },
                    { label: 'Website', icon: Globe, value: user?.companyId?.website || '—' },
                    { label: 'Address', icon: MapPin, value: user?.companyId?.address || '—', wide: true },
                  ]} />
               </div>
            </div>
          )}
        </div>
      )}

      {/* ── Work Tab ── */}
      {activeTab === 'work' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Work identity</h2>
            <p className="text-xs text-slate-400 mt-0.5">Organisational details and reporting structure</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: User, label: 'Department', value: user?.departmentId?.name || '—', color: 'indigo' },
              { icon: Briefcase, label: 'Designation', value: user?.designation || '—', color: 'violet' },
              { icon: User, label: 'Reporting Manager', value: user?.reportingTo?.name || 'Admin / Owner', color: 'purple' },
              { icon: Tag, label: 'Role', value: user?.role, color: 'emerald' },
              { icon: Building, label: 'Corporate Support Email', value: user?.companyId?.companyEmail || user?.email, color: 'sky' },
              { icon: Calendar, label: 'Date of joining', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—', color: 'amber' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className={`p-4 rounded-xl border bg-${color}-50/50 border-${color}-100`}>
                <Icon className={`w-4 h-4 text-${color}-500 mb-2`} />
                <p className={`text-[10px] font-medium text-${color}-400 uppercase tracking-wider mb-1`}>{label}</p>
                <p className={`text-sm font-semibold text-${color}-900 truncate`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Security Tab ── */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900">Change password</h2>
            <p className="text-xs text-slate-400 mt-0.5">Update your account security credentials</p>
          </div>
          <form onSubmit={handleChangePassword} className="max-w-sm space-y-4">
            <Field label="Current password" icon={Lock}>
              <div className="relative">
                <input type={showOldPassword ? 'text' : 'password'} className={`${inputCls} pr-10`} value={passwordForm.oldPassword} onChange={e => setPasswordForm(p => ({ ...p, oldPassword: e.target.value }))} required />
                <button type="button" onClick={() => setShowOldPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="New password" icon={Lock}>
              <div className="relative">
                <input type={showNewPassword ? 'text' : 'password'} className={`${inputCls} pr-10`} value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} required />
                <button type="button" onClick={() => setShowNewPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm new password" icon={Lock}>
              <input type="password" className={inputCls} value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
            </Field>

            <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Minimum 6 characters. Use uppercase, lowercase and numbers for stronger security.</p>
            </div>

            <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-60">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
              Update password
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

/* ── Helpers ── */
const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all';

const Field = ({ label, icon: Icon, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />} {label}
    </label>
    {children}
  </div>
);

const InfoGrid = ({ items }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
    {items.map(({ label, icon: Icon, value, wide }) => (
      <div key={label} className={wide ? 'sm:col-span-2' : ''}>
        <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1">
          {Icon && <Icon className="w-3.5 h-3.5" />} {label}
        </p>
        <p className="text-sm font-semibold text-slate-800">{value || '—'}</p>
      </div>
    ))}
  </div>
);

export default Profile;