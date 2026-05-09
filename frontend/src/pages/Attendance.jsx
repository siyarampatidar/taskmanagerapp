import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMyAttendance,
  checkInAction,
  checkOutAction,
  fetchSalaryReport,
  fetchCompanyDetails,
  updateOfficeLocation,
  manualUpdateAttendance,
  fetchLeaves,
  applyLeave,
  processLeave
} from '../redux/slices/attendanceSlice';
import {
  MapPin,
  Clock,
  Calendar,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings,
  DollarSign,
  Users,
  ChevronRight,
  MoreVertical,
  Edit2,
  PlaneTakeoff,
  ClipboardList,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

const StatusDropdown = ({ currentStatus, onTypeChange }) => {
  const statuses = [
    { id: 'present', label: 'Present', color: 'text-blue-600 bg-blue-50' },
    { id: 'late', label: 'Late', color: 'text-orange-600 bg-orange-50' },
    { id: 'absent', label: 'Absent', color: 'text-slate-600 bg-slate-50' },
    { id: 'paid-leave', label: 'Paid Leave', color: 'text-blue-600 bg-blue-50' },
    { id: 'half-day', label: 'Half Day', color: 'text-blue-400 bg-blue-50' },
    { id: 'unpaid-leave', label: 'Unpaid Leave', color: 'text-slate-400 bg-slate-50' },
  ];

  const getStatusStyle = (id) => {
    switch (id) {
      case 'present': return 'bg-blue-600 text-white';
      case 'late': return 'bg-orange-500 text-white';
      case 'absent': return 'bg-red-600 text-white';
      case 'paid-leave': return 'bg-indigo-600 text-white';
      case 'half-day': return 'bg-amber-500 text-white';
      case 'unpaid-leave': return 'bg-slate-400 text-white';
      case 'holiday': return 'bg-slate-100 text-slate-400';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <select
      value={currentStatus}
      onChange={(e) => onTypeChange(e.target.value)}
      className={`text-[10px] font-bold py-1 px-2 rounded-lg border-none outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer ${getStatusStyle(currentStatus)}`}
    >
      {statuses.map(s => (
        <option key={s.id} value={s.id} className="bg-white text-slate-900">{s.label}</option>
      ))}
    </select>
  );
};

const LeaveRequestModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    type: 'casual',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      return toast.error("End date cannot be before start date");
    }
    setLoading(true);
    const result = await dispatch(applyLeave(formData));
    if (applyLeave.fulfilled.match(result)) {
      toast.success("Leave application submitted!");
      onClose();
    } else {
      toast.error(result.payload || "Failed to submit leave");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Apply for Leave</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Leave Type</label>
            <select
              className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs font-bold"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="sick">Sick Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="earned">Earned Leave</option>
              <option value="emergency">Emergency Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Start Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs font-bold"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">End Date</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs font-bold"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Reason</label>
            <textarea
              required
              rows="3"
              className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              placeholder="Brief reason for leave..."
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:bg-slate-200">
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AttendanceModal = ({ isOpen, onClose, employee, month: initialMonth, year: initialYear }) => {
  const dispatch = useDispatch();
  const { salaryReport: allAttendanceReport, leaves } = useSelector(state => state.attendance);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewType, setViewType] = useState('monthly');
  const [updating, setUpdating] = useState(false);
  const [editingDay, setEditingDay] = useState(null); // { day, currentStatus }

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchSalaryReport({ month: viewMonth, year: viewYear }));
    }
  }, [isOpen, viewMonth, viewYear, dispatch]);

  if (!isOpen || !employee) return null;

  const currentEmployee = allAttendanceReport.find(emp => emp.userId === employee.userId) || employee;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const getStatusForDate = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (d.getDay() === 0) return 'holiday';

    const record = currentEmployee.records?.find(r => {
      const recDate = new Date(r.date);
      return recDate.getDate() === day && recDate.getMonth() === viewMonth && recDate.getFullYear() === viewYear;
    });
    if (record) return record.status;

    const hasLeave = leaves?.find(l =>
      l.userId === employee.userId &&
      l.status === 'approved' &&
      d >= new Date(new Date(l.startDate).setHours(0, 0, 0, 0)) &&
      d <= new Date(new Date(l.endDate).setHours(23, 59, 59, 999))
    );
    if (hasLeave) return 'paid-leave';

    if (d < today) return 'absent';
    return 'holiday';
  };

  const handleStatusChange = async (day, newStatus) => {
    const date = new Date(viewYear, viewMonth, day).toISOString();
    setUpdating(true);
    const result = await dispatch(manualUpdateAttendance({ userId: employee.userId, date, status: newStatus }));
    if (manualUpdateAttendance.fulfilled.match(result)) {
      toast.success(`Updated Day ${day} to ${newStatus}`);
      dispatch(fetchSalaryReport({ month: viewMonth, year: viewYear }));
    } else {
      toast.error("Update failed");
    }
    setUpdating(false);
  };

  const cfg = {
    'present': { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', label: 'P' },
    'absent': { bg: 'bg-red-50 border-red-100', text: 'text-red-700', label: 'A' },
    'half-day': { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700', label: 'H' },
    'paid-leave': { bg: 'bg-indigo-50 border-indigo-100', text: 'text-indigo-700', label: 'PL' },
    'unpaid-leave': { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-600', label: 'UL' },
    'late': { bg: 'bg-orange-50 border-orange-100', text: 'text-orange-700', label: 'LA' },
    'holiday': { bg: 'bg-slate-50 border-slate-100', text: 'text-slate-300', label: '—' },
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {employee.name[0]}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{employee.name}</h2>
              <p className="text-[10px] text-slate-500 font-medium">Monthly Attendance & Payroll Report</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {viewType === 'monthly' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left Side: Calendar & Stats */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <select
                      className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 transition-colors"
                      value={viewMonth}
                      onChange={(e) => setViewMonth(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                    <select
                      className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 transition-colors"
                      value={viewYear}
                      onChange={(e) => setViewYear(parseInt(e.target.value))}
                    >
                      {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setViewType('yearly')} className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:underline">Switch to Yearly</button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 p-5">
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
                    ))}
                  </div>
                  {(() => {
                    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
                    const offset = firstDay === 0 ? 6 : firstDay - 1;
                    const cells = [];
                    for (let i = 0; i < offset; i++) cells.push(null);
                    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                    while (cells.length % 7 !== 0) cells.push(null);
                    const weeks = [];
                    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

                    return weeks.map((week, wi) => (
                      <div key={wi} className="grid grid-cols-7 gap-2 mb-2">
                        {week.map((day, di) => {
                          if (!day) return <div key={di} className="aspect-square" />;
                          const isSunday = new Date(viewYear, viewMonth, day).getDay() === 0;
                          const status = getStatusForDate(day);
                          const c = cfg[status] || cfg['holiday'];
                          const rec = currentEmployee.records?.find(r => {
                            const rd = new Date(r.date);
                            return rd.getDate() === day && rd.getMonth() === viewMonth && rd.getFullYear() === viewYear;
                          });
                          const t = rec?.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

                          return (
                            <div key={di}
                              className={`aspect-square rounded-lg border ${c.bg} flex flex-col items-center justify-center relative group cursor-pointer hover:bg-opacity-80 transition-all`}
                              onClick={() => !isSunday && setEditingDay({ day, currentStatus: status })}
                            >
                              <span className={`text-[13px] font-bold ${c.text}`}>{day}</span>
                              <span className={`text-[8px] font-bold ${c.text} opacity-60`}>{c.label}</span>
                              {t && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900 text-white text-[8px] font-bold px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                                  {t}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-slate-50">
                    {Object.entries(cfg).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${v.bg.split(' ')[0]}`} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{k.replace('-', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Breakdown */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Salary Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-slate-500 font-medium">Base Salary</span>
                      <span className="text-xs font-bold text-slate-900">₹{currentEmployee.baseSalary?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-red-600">
                      <span className="text-[11px] font-medium">Deductions</span>
                      <span className="text-xs font-bold">- ₹{((currentEmployee.absentDays + (currentEmployee.halfDays * 0.5)) * (currentEmployee.baseSalary / daysInMonth)).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600">
                      <span className="text-[11px] font-medium">Overtime Pay</span>
                      <span className="text-xs font-bold">+ ₹{currentEmployee.overtimePay}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900 uppercase">Net Payable</span>
                      <span className="text-base font-bold text-indigo-600">₹{currentEmployee.calculatedSalary?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Present</p>
                    <p className="text-sm font-bold text-slate-900">{currentEmployee.presentDays}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Absent</p>
                    <p className="text-sm font-bold text-slate-900">{currentEmployee.absentDays}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Leaves</p>
                    <p className="text-sm font-bold text-slate-900">{currentEmployee.paidLeaves + (currentEmployee.unpaidLeaves || 0)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Overtime</p>
                    <p className="text-sm font-bold text-slate-900">{currentEmployee.totalOvertimeHours}h</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 12 }, (_, i) => {
                const monthName = new Date(0, i).toLocaleString('default', { month: 'long' });
                return (
                  <div key={i} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center group hover:border-indigo-200 transition-all cursor-pointer" onClick={() => { setViewMonth(i); setViewType('monthly'); }}>
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-3">{monthName}</p>
                    <Calendar className="w-6 h-6 text-slate-300 mb-3 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">View Report</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Selection Popover Overlay */}
        {editingDay && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setEditingDay(null)}>
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-full max-w-[220px] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Update Day {editingDay.day}</h3>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(cfg).filter(([k]) => k !== 'holiday').map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => {
                      handleStatusChange(editingDay.day, k);
                      setEditingDay(null);
                    }}
                    className={`w-full px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all text-center border ${k === editingDay.currentStatus
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                      }`}
                  >
                    {k.replace('-', ' ')}
                  </button>
                ))}
              </div>
              <button onClick={() => setEditingDay(null)} className="w-full mt-3 py-1.5 text-[9px] font-bold uppercase text-slate-400 hover:text-slate-600 tracking-tight">Cancel</button>
            </div>
          </div>
        )}

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[10px] text-slate-400 font-medium italic">Changes are saved automatically.</p>
          <button onClick={onClose} className="px-8 py-2 bg-slate-900 rounded-lg text-[11px] font-bold text-white uppercase tracking-wider hover:bg-black transition-colors shadow-sm">Done</button>
        </div>
      </div>
    </div>
  );
};

const Attendance = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { attendance, salaryReport, companyDetails, leaves, loading } = useSelector(state => state.attendance);

  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? 'salary' : 'mine');
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  useEffect(() => {
    dispatch(fetchMyAttendance());
    dispatch(fetchCompanyDetails());
    dispatch(fetchLeaves());
    getGeoLocation();
    if (user?.role === 'admin' || user?.role === 'hr') {
      dispatch(fetchSalaryReport({ month: currentMonth, year: currentYear }));
    }
  }, [dispatch, user, currentMonth, currentYear]);

  const getGeoLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
      }
    );
  };

  const handleCheckIn = async () => {
    if (!location) return toast.error("Capture location first!");
    const result = await dispatch(checkInAction(location));
    if (checkInAction.fulfilled.match(result)) toast.success("Punch-in success!");
  };

  const handleCheckOut = async () => {
    const result = await dispatch(checkOutAction());
    if (checkOutAction.fulfilled.match(result)) toast.success("Punch-out success!");
  };

  const handleUpdateOfficeLocation = async (lat, lng, radius) => {
    const result = await dispatch(updateOfficeLocation({ lat, lng, allowedRadius: radius }));
    if (updateOfficeLocation.fulfilled.match(result)) {
      toast.success("Office location updated!");
    } else {
      toast.error("Failed to update location");
    }
  };

  const distanceFromOffice = location && companyDetails?.officeLocation?.lat
    ? calculateDistance(
      location.lat,
      location.lng,
      companyDetails.officeLocation.lat,
      companyDetails.officeLocation.lng
    )
    : null;

  const isWithinRange = distanceFromOffice !== null && distanceFromOffice <= (companyDetails?.allowedRadius || 200);

  const exportToCSV = () => {
    if (!salaryReport || salaryReport.length === 0) return toast.error("No data to export");
    const headers = "Team Member,Base Salary,Present Days,Absent Days,Paid Leaves,Half Days,Missing Checkouts,OT Hours,OT Pay,Total Payable Days,Calculated Salary\n";
    const rows = salaryReport.map(r =>
      `${r.name},${r.baseSalary},${r.presentDays},${r.absentDays},${r.paidLeaves},${r.halfDays},${r.missingCheckouts || 0},${r.totalOvertimeHours || 0},${r.overtimePay || 0},${r.totalPayableDays},${r.calculatedSalary}`
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Salary_Report_${currentMonth + 1}_${currentYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const todayRecord = attendance.find(a =>
    new Date(a.date).toLocaleDateString() === new Date().toLocaleDateString()
  );

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">Attendance Console</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500 font-medium tracking-tight">Systematic presence tracking and payout estimation.</p>
            <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg p-1 shadow-sm">
              <select
                className="text-[10px] font-black uppercase tracking-widest border-none outline-none bg-transparent cursor-pointer text-blue-600"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
              <select
                className="text-[10px] font-black uppercase tracking-widest border-none outline-none bg-transparent cursor-pointer text-blue-600"
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {user?.role !== 'admin' && (
            <button
              onClick={() => setActiveTab('mine')}
              className={`cursor-pointer px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'mine' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              My Record
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'hr') && (
            <button
              onClick={() => setActiveTab('salary')}
              className={`cursor-pointer px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'salary' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Team Management
            </button>
          )}
          <button
            onClick={() => setActiveTab('leaves')}
            className={`cursor-pointer px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'leaves' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Leaves
          </button>
        </div>
      </div>

      {activeTab === 'mine' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Punch Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm group">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Live Status</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Punch-in Tracker</p>
                </div>
              </div>

              {!todayRecord ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border border-dashed transition-all ${location ? (isWithinRange ? 'border-emerald-200 bg-emerald-50/10' : 'border-rose-200 bg-rose-50/10') : 'border-slate-200 bg-slate-50/50'}`}>
                    <p className="text-[10px] text-slate-500 text-center mb-3">
                      {location
                        ? isWithinRange
                          ? `At Office (${Math.round(distanceFromOffice)}m)`
                          : `Outside Range (${Math.round(distanceFromOffice)}m away)`
                        : "Detect location to punch-in"}
                    </p>
                    <button onClick={getGeoLocation} disabled={isLocating} className="cursor-pointer w-full text-[10px] font-bold py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                      {isLocating ? "Detecting..." : location ? "Refresh Location" : "Capture Location"}
                    </button>
                  </div>

                  <button
                    onClick={handleCheckIn}
                    disabled={!location || loading || (companyDetails?.officeLocation?.lat && !isWithinRange)}
                    className={`cursor-pointer w-full py-3 rounded-lg text-xs font-bold transition-all uppercase tracking-widest ${!location || loading || (companyDetails?.officeLocation?.lat && !isWithinRange)
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100'
                      }`}
                  >
                    {companyDetails?.officeLocation?.lat && !isWithinRange ? "Out of Range" : "Punch-In"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mb-1">Status Today</p>
                    <p className="text-sm font-bold text-slate-900 capitalize italic">{todayRecord.status}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Arrival Time</p>
                      <p className="text-xs font-bold text-slate-900">{new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    {todayRecord.checkOut && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Departure Time</p>
                        <p className="text-xs font-bold text-slate-900">{new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    )}
                  </div>

                  {!todayRecord.checkOut && (
                    <button
                      onClick={handleCheckOut}
                      className="cursor-pointer w-full py-3 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest"
                    >
                      Punch-Out
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stats Summary Info */}
            <div className="bg-blue-600 rounded-xl p-6 text-white shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold mb-4">Monthly Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-white/10 uppercase tracking-tighter">
                    <span className="text-[10px] opacity-80">Present Days</span>
                    <span className="text-xs font-bold">{attendance.filter(a => a.status === 'present').length}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/10 uppercase tracking-tighter">
                    <span className="text-[10px] opacity-80">Paid Leaves</span>
                    <span className="text-xs font-bold">{attendance.filter(a => a.status === 'paid-leave').length}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <PlaneTakeoff className="w-4 h-4" />
                Apply for Leave
              </button>
            </div>

            {/* Admin Office Settings */}
            {(user?.role === 'admin') && (
              <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Office Setup</h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Admin Only</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-2">Saved Coordinates</p>
                    {companyDetails?.officeLocation?.lat ? (
                      <p className="text-[10px] font-bold text-slate-900">
                        {companyDetails.officeLocation.lat.toFixed(4)}, {companyDetails.officeLocation.lng.toFixed(4)}
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-rose-500 italic">Not configured</p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (!location) return toast.error("Capture your current location first!");
                      handleUpdateOfficeLocation(location.lat, location.lng, companyDetails?.allowedRadius || 200);
                    }}
                    className="cursor-pointer w-full py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-blue-100"
                  >
                    Set Current as Office
                  </button>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Allowed Radius (m)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg text-xs font-bold mb-4"
                      value={companyDetails?.allowedRadius || 200}
                      onChange={(e) => handleUpdateOfficeLocation(companyDetails.officeLocation.lat, companyDetails.officeLocation.lng, parseInt(e.target.value))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Shift Start</label>
                      <input
                        type="time"
                        className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg text-xs font-bold"
                        value={companyDetails?.shiftSettings?.startTime || "10:00"}
                        onChange={(e) => dispatch(updateOfficeLocation({ shiftSettings: { ...companyDetails.shiftSettings, startTime: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Grace (min)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg text-xs font-bold"
                        value={companyDetails?.shiftSettings?.gracePeriod || 15}
                        onChange={(e) => dispatch(updateOfficeLocation({ shiftSettings: { ...companyDetails.shiftSettings, gracePeriod: parseInt(e.target.value) } }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* History List as a Grid of Date Cards */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Attendance Calendar</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Date-wise Status</p>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                {attendance.length > 0 ? [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => (
                  <div key={item._id} className="aspect-square rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center p-2 hover:border-blue-400 transition-all cursor-default group relative">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-sm font-black text-slate-900 leading-none">{new Date(item.date).getDate()}</span>

                    <div className={`mt-2 w-1.5 h-1.5 rounded-full ${item.status === 'present' ? 'bg-blue-400' :
                      item.status === 'half-day' ? 'bg-blue-200' :
                        'bg-slate-300'
                      }`} />

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[9px] rounded font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none uppercase tracking-widest">
                      {item.status} | {item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-20 text-center text-slate-300 italic text-[10px]">
                    No attendance data recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {salaryReport.map(emp => (
              <div key={emp.userId} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm transition-all group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                    {emp.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{emp.name}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">₹{emp.baseSalary}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-900">{emp.presentDays}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">P</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-red-600">{emp.absentDays || 0}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">A</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-900">{emp.paidLeaves}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">L</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-900">{emp.totalPayableDays}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Days</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setIsModalOpen(true);
                  }}
                  className="cursor-pointer w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-3 h-3" />
                  Manage
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Salary Report</h3>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">{new Date(currentYear, currentMonth).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-lg">{salaryReport.length} Members</span>
                <button onClick={exportToCSV} className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm">
                  <Download className="w-3 h-3" /> Export CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Member</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Salary</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Efficiency (P/A/L/H/M)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Overtime</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Estimated Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {salaryReport.map((row) => {
                    const pct = Math.min(100, Math.round(((row.presentDays || 0) / (row.totalPayableDays || 1)) * 100));
                    return (
                      <tr
                        key={row.userId}
                        onClick={() => { setSelectedEmployee(row); setIsModalOpen(true); }}
                        className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                              {row.image
                                ? <img src={row.image} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-white text-sm font-black" style={{ background: 'linear-gradient(135deg,#4f46e5,#06b6d4)' }}>{row.name[0]}</div>
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate mb-0.5">{row.name}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">{row.totalPayableDays} Payable Days</p>
                              <div className="flex items-center gap-1.5">
                                <div className="h-1 w-20 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[8px] font-black text-slate-400">{pct}%</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-black text-slate-600">₹{(row.baseSalary || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100" title="Present">{row.presentDays}P</span>
                            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100" title="Absent">{row.absentDays || 0}A</span>
                            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100" title="Paid Leaves">{row.paidLeaves}L</span>
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100" title="Half Days">{row.halfDays}H</span>
                            {row.missingCheckouts > 0 && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100" title="Missing Checkouts">{row.missingCheckouts}M</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-indigo-600">{row.totalOvertimeHours || 0} hrs</span>
                            <span className="text-[9px] text-slate-400 font-bold">+₹{row.overtimePay?.toLocaleString() || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm font-black text-slate-900 font-mono">₹{(row.calculatedSalary || 0).toLocaleString()}</span>
                            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                              <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-white transition-colors" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Leave Requests</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {user?.role === 'admin' || user?.role === 'hr' ? "Company-wide leave overview" : "Your leave application history"}
                </p>
              </div>
              {user?.role !== 'admin' && (
                <button
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="cursor-pointer px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <PlaneTakeoff className="w-3.5 h-3.5" />
                  New Request
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">User / Type</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Duration</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reason</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    {(user?.role === 'admin' || user?.role === 'hr') && (
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(leaves || []).length > 0 ? leaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {(user?.role === 'admin' || user?.role === 'hr') && (
                            <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[9px] font-black text-slate-500">
                              {leave.userId?.name?.[0] || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="text-[11px] font-black text-slate-900 capitalize">{leave.type} Leave</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{leave.userId?.name || "Self"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-900">
                            {Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} Days
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-[10px] text-slate-500 font-medium line-clamp-2">{leave.reason}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${leave.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' :
                          leave.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                          {leave.status}
                        </span>
                      </td>
                      {(user?.role === 'admin' || user?.role === 'hr') && (
                        <td className="px-6 py-4 text-right">
                          {leave.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  dispatch(processLeave({ id: leave._id, data: { status: 'approved' } }))
                                    .then(() => dispatch(fetchSalaryReport({ month: currentMonth, year: currentYear })));
                                }}
                                className="w-7 h-7 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                title="Approve"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt("Enter rejection reason:");
                                  if (reason) {
                                    dispatch(processLeave({ id: leave._id, data: { status: 'rejected', rejectionReason: reason } }))
                                      .then(() => dispatch(fetchSalaryReport({ month: currentMonth, year: currentYear })));
                                  }
                                }}
                                className="w-7 h-7 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                title="Reject"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-300 font-bold uppercase">Processed</span>
                          )}
                        </td>
                      )}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-30">
                          <ClipboardList className="w-10 h-10" />
                          <p className="text-[10px] font-black uppercase tracking-widest">No leave requests found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Attendance Modal */}
      <AttendanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employee={selectedEmployee}
        month={currentMonth}
        year={currentYear}
      />
      {isLeaveModalOpen && (
        <LeaveRequestModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Attendance;
