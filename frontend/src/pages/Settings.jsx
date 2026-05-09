import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, Save, CheckCircle2, MapPin, Navigation, User, Phone, Briefcase, Activity, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCompanyDetails, updateOfficeLocation } from '../redux/slices/attendanceSlice';
import { updateProfile } from '../redux/slices/authSlice';
import { useAuth } from '../hooks/useAuth';

const Settings = () => {
  const dispatch = useDispatch();
  const { companyDetails } = useSelector(state => state.attendance);
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'office'
  
  // Office Settings State
  const [locationSettings, setLocationSettings] = useState({
    lat: '',
    lng: '',
    allowedRadius: 200
  });

  // Profile Settings State
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    designation: ''
  });

  const [saving, setSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') {
       dispatch(fetchCompanyDetails());
    }
    if (user) {
        setProfileForm({
            name: user.name || '',
            phone: user.phone || '',
            designation: user.designation || ''
        });
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (companyDetails) {
      setLocationSettings({
        lat: companyDetails.officeLocation?.lat || '',
        lng: companyDetails.officeLocation?.lng || '',
        allowedRadius: companyDetails.allowedRadius || 200
      });
    }
  }, [companyDetails]);

  const captureCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationSettings(prev => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }));
        setIsLocating(false);
        toast.success("Location captured!");
      },
      (err) => {
        toast.error("Error: " + err.message);
        setIsLocating(false);
      }
    );
  };

  const handleSaveOffice = async () => {
    setSaving(true);
    try {
      await dispatch(updateOfficeLocation(locationSettings)).unwrap();
      toast.success('Office configuration updated!');
    } catch (error) {
      toast.error(error?.message || 'Failed to update location');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
        await dispatch(updateProfile(profileForm)).unwrap();
        toast.success('Profile updated successfully!');
    } catch (error) {
        toast.error(error?.message || 'Failed to update profile');
    } finally {
        setSaving(false);
    }
  };

  const mapUrl = locationSettings.lat && locationSettings.lng 
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${locationSettings.lng - 0.005}%2C${locationSettings.lat - 0.005}%2C${locationSettings.lng + 0.005}%2C${locationSettings.lat + 0.005}&layer=mapnik&marker=${locationSettings.lat}%2C${locationSettings.lng}`
    : null;

  const isAdmin = ['admin', 'superadmin', 'manager'].includes(user?.role);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Settings & Profile</h1>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Manage your personal information and system preferences.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-100 gap-8">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'profile' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          My Profile
          {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('office')}
            className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'office' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Office Config
            {activeTab === 'office' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
          </button>
        )}
      </div>

      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                <div className="flex flex-col items-center text-center gap-4 mb-8">
                    <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-100">
                        {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900">{user?.name}</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{user?.role} • {user?.designation || 'Staff member'}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                                type="text"
                                value={profileForm.name}
                                onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Calling Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                                type="text"
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                placeholder="E.g. +919876543210"
                                className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                            />
                        </div>
                        <p className="text-[9px] text-amber-600 font-bold px-1 mt-1">IMPORTANT: This number will be used for Exotel calls.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Designation</label>
                        <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input 
                                type="text"
                                value={profileForm.designation}
                                onChange={(e) => setProfileForm({...profileForm, designation: e.target.value})}
                                className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="w-full btn-primary py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-50 mt-4 h-12"
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        <span className="text-xs font-black uppercase tracking-widest">{saving ? 'Saving...' : 'Update Profile'}</span>
                    </button>
                </div>
            </div>
          </div>
          <div className="lg:col-span-2">
             <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[32px] p-10 text-white h-full relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-4">Hello, {user?.name}!</h2>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                        This is your personal settings area. Make sure your phone number is correct to use the integrated calling features in CRM. 
                        Your designation and role determine your access across the TeamFlow modules.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-12">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Current Role</p>
                            <p className="text-lg font-black">{user?.role?.toUpperCase()}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Company</p>
                            <p className="text-lg font-black">{user?.companyId?.name || 'Company Member'}</p>
                        </div>
                    </div>
                </div>
                <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
           <div className="lg:col-span-1 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm h-fit">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Boundary Settings</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Attendance Shield</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Office Latitude</label>
                    <input 
                      type="number" step="any"
                      value={locationSettings.lat}
                      onChange={(e) => setLocationSettings({...locationSettings, lat: e.target.value})}
                      placeholder="E.g. 26.9124"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Office Longitude</label>
                    <input 
                      type="number" step="any"
                      value={locationSettings.lng}
                      onChange={(e) => setLocationSettings({...locationSettings, lng: e.target.value})}
                      placeholder="E.g. 75.7873"
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Allowed Radius (In Meters)</label>
                    <input 
                      type="number"
                      value={locationSettings.allowedRadius}
                      onChange={(e) => setLocationSettings({...locationSettings, allowedRadius: e.target.value})}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={captureCurrentLocation}
                        disabled={isLocating}
                        className="cursor-pointer flex-1 flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isLocating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Navigation className="w-4 h-4" />}
                        {isLocating ? '...' : 'Auto Detect'}
                    </button>
                    <button 
                        onClick={handleSaveOffice}
                        disabled={saving}
                        className="flex-1 btn-primary py-4 rounded-2xl flex items-center justify-center gap-3"
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Config'}
                    </button>
                </div>
              </div>
           </div>

           <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm min-h-[500px] flex flex-col">
              <div className="flex-1 relative bg-gray-50 flex items-center justify-center">
                 {mapUrl ? (
                   <iframe width="100%" height="100%" className="border-0" src={mapUrl} />
                 ) : (
                   <div className="flex flex-col items-center gap-4 text-center p-12">
                      <MapPin className="w-10 h-10 text-gray-200" />
                      <p className="text-xs text-slate-400">Map Not Ready</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
