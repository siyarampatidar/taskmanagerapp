import { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Plus, 
  MoreVertical, 
  ShieldAlert, 
  UserMinus, 
  UserPlus, 
  Search,
  CheckCircle2,
  XCircle,
  Mail,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2 as CheckIcon,
  XCircle as XIcon
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchEmployees, 
  fetchDepartments, 
  createDepartment, 
  inviteEmployee, 
  deleteEmployee, 
  deleteDepartment, 
  updateDepartment, 
  updateEmployee,
  fetchLeaves,
  applyLeave,
  processLeave
} from '../redux/slices/hrSlice';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/common/ConfirmModal';

const ROLES = ['employee', 'teamhead', 'manager', 'hr', 'sales', 'marketing'];

const validateEmail = (email) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
};

const HRM = () => {
  const dispatch = useDispatch();
  const { employees, departments, leaves, loading } = useSelector((state) => state.hr);
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('employees');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    if (showInviteModal) {
      dispatch(fetchDepartments());
    }
  }, [showInviteModal, dispatch]);
  
  const [empForm, setEmpForm] = useState({ 
    name: '', email: '', password: '', role: 'employee', 
    designation: '', departmentId: '', reportingTo: '',
    salary: '', phone: '', gender: ''
  });
  const [leaveForm, setLeaveForm] = useState({ type: 'sick', startDate: '', endDate: '', reason: '' });
  const [deptForm, setDeptForm] = useState({ name: '', crmAccessLevel: 'none' });
  const [editingDept, setEditingDept] = useState(null);
  const [editingEmp, setEditingEmp] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('member'); // 'member' or 'department'

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchDepartments());
    dispatch(fetchLeaves());
  }, [dispatch]);

  // Auto-suggest Reporting To
  useEffect(() => {
    if (!empForm.departmentId || editingEmp) return;

    if (empForm.role === 'teamhead' || empForm.role === 'manager') {
      // Heads usually report to Admin
      setEmpForm(prev => ({ ...prev, reportingTo: '' }));
    } else {
      // Employees/Sales/Marketing should report to their Department Head
      const deptHead = employees.find(e => 
        (e.departmentId?._id === empForm.departmentId || e.departmentId === empForm.departmentId) && 
        ['teamhead', 'manager', 'hr'].includes(e.role)
      );
      if (deptHead) {
        setEmpForm(prev => ({ ...prev, reportingTo: deptHead._id }));
      }
    }
  }, [empForm.departmentId, empForm.role, employees, editingEmp]);

  const handleInvite = async (e) => {
    e.preventDefault();

    if (!validateEmail(empForm.email)) {
      toast.error('Please enter a valid email address (e.g. name@company.com)');
      return;
    }

    if (empForm.email !== empForm.email.toLowerCase()) {
      toast.error('Email must be in lowercase');
      return;
    }

    if (editingEmp) {
      const payload = { ...empForm, email: empForm.email.toLowerCase() };
      if (!payload.departmentId || payload.departmentId === "") {
        payload.departmentId = null;
      }
      const result = await dispatch(updateEmployee({ id: editingEmp._id, data: payload }));
      if (updateEmployee.fulfilled.match(result)) {
        toast.success('Member details updated!');
        setShowInviteModal(false);
        setEditingEmp(null);
        setEmpForm({ name: '', email: '', password: '', role: 'employee', designation: '', departmentId: '', reportingTo: '', salary: '', phone: '', gender: '' });
      } else {
        toast.error(result.payload || 'Error updating member');
      }
    } else {
      const payload = { ...empForm, email: empForm.email.toLowerCase() };
      if (!payload.departmentId || payload.departmentId === "") {
        payload.departmentId = null;
      }
      
      const result = await dispatch(inviteEmployee(payload));
      if (inviteEmployee.fulfilled.match(result)) {
        toast.success(empForm.password ? 'Member added successfully!' : 'Invitation sent successfully!');
        setShowInviteModal(false);
        setEmpForm({ name: '', email: '', password: '', role: 'employee', designation: '', departmentId: '', reportingTo: '', salary: '', phone: '', gender: '' });
        dispatch(fetchEmployees());
      } else {
        toast.error(result.payload || 'Error adding/inviting employee');
      }
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    const result = await dispatch(applyLeave(leaveForm));
    if (applyLeave.fulfilled.match(result)) {
      toast.success('Leave application submitted!');
      setShowLeaveModal(false);
      setLeaveForm({ type: 'sick', startDate: '', endDate: '', reason: '' });
      dispatch(fetchLeaves());
    } else {
      toast.error(result.payload || 'Error applying for leave');
    }
  };

  const handleProcessLeave = async (id, status) => {
    const result = await dispatch(processLeave({ id, data: { status } }));
    if (processLeave.fulfilled.match(result)) {
      toast.success(`Leave ${status}!`);
      dispatch(fetchLeaves());
    } else {
      toast.error(result.payload || 'Error processing leave');
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (editingDept) {
      const result = await dispatch(updateDepartment({ id: editingDept._id, data: deptForm }));
      if (updateDepartment.fulfilled.match(result)) {
        toast.success('Department updated!');
        setShowDeptModal(false);
        setEditingDept(null);
        setDeptForm({ name: '', crmAccessLevel: 'none' });
      } else {
        toast.error(result.payload || 'Error updating department');
      }
    } else {
      const result = await dispatch(createDepartment(deptForm));
      if (createDepartment.fulfilled.match(result)) {
        toast.success('Department created!');
        setShowDeptModal(false);
        setDeptForm({ name: '', crmAccessLevel: 'none' });
        dispatch(fetchDepartments());
      } else {
        toast.error(result.payload || 'Error creating department');
      }
    }
  };

  const handleDeleteEmployee = (id) => {
    setItemToDelete(id);
    setDeleteType('member');
    setShowDeleteModal(true);
  };

  const handleDeleteDept = (id) => {
    setItemToDelete(id);
    setDeleteType('department');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    if (deleteType === 'member') {
      const result = await dispatch(deleteEmployee(itemToDelete));
      if (deleteEmployee.fulfilled.match(result)) {
        toast.success('Member removed');
      } else {
        toast.error(result.payload || 'Error removing member');
      }
    } else {
      const result = await dispatch(deleteDepartment(itemToDelete));
      if (deleteDepartment.fulfilled.match(result)) {
        toast.success('Department deleted');
        dispatch(fetchEmployees());
      } else {
        toast.error(result.payload || 'Error deleting department');
      }
    }
    setItemToDelete(null);
  };

  const canManage = ['admin', 'hr', 'manager'].includes(user?.role);
  const isOwner = user?.role === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Human Resources</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage your department structure and workforce efficiency.</p>
        </div>
        
        {canManage && (
          <div className="flex gap-3">
            <button 
              onClick={() => setShowDeptModal(true)} 
              className="cursor-pointer btn-secondary flex items-center gap-2 group border-slate-200"
            >
              <Building2 className="w-4 h-4 text-blue-600 transition-transform group-hover:scale-110" />
              <span>Add Department</span>
            </button>
            <button 
              onClick={() => setShowInviteModal(true)} 
              className="cursor-pointer btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
              <span>Add Employee</span>
            </button>
          </div>
        )}
      </div>


      {/* Control Bar */}
      <div className="flex items-center justify-between bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex gap-1">
          <button 
            onClick={() => setActiveTab('employees')}
            className={`cursor-pointer px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'employees' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Employees ({employees.filter(e => e.role !== 'admin').length})
          </button>
          <button 
            onClick={() => setActiveTab('departments')}
            className={`cursor-pointer px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'departments' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Departments ({departments.length})
          </button>
          <button 
            onClick={() => setActiveTab('leaves')}
            className={`cursor-pointer px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'leaves' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Leaves ({leaves.length})
          </button>
        </div>
        
        <div className="flex items-center gap-2">
           {activeTab === 'leaves' && (
              <button 
                onClick={() => setShowLeaveModal(true)}
                className="cursor-pointer btn-primary flex items-center gap-2 px-3 py-1.5 text-xs shadow-none mr-2"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Apply Leave</span>
              </button>
           )}
           <div className="relative mr-2">
             <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text" 
               placeholder="Filter list..." 
               className="input-field pl-9 py-1.5 text-xs w-56 border-slate-100 bg-slate-50/50"
             />
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-xs font-medium">Synchronizing workforce data...</p>
          </div>
        ) : activeTab === 'employees' ? (
          <div className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {employees.filter(emp => emp.role !== 'admin').map(emp => (
                <div key={emp._id} className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col justify-between hover:border-blue-200 hover:shadow-sm transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {emp.name[0]}
                      </div>
                      {canManage && (
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => {
                              setEditingEmp(emp);
                              setEmpForm({
                                name: emp.name,
                                email: emp.email,
                                role: emp.role,
                                designation: emp.designation,
                                departmentId: emp.departmentId?._id || emp.departmentId,
                                reportingTo: emp.reportingTo?._id || emp.reportingTo,
                                salary: emp.salary || '',
                                phone: emp.phone || '',
                                gender: emp.gender || ''
                              });
                              setShowInviteModal(true);
                            }}
                            className="cursor-pointer p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors shadow-sm"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isOwner && (
                            <button 
                              onClick={() => handleDeleteEmployee(emp._id)}
                              className="cursor-pointer p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 mb-4">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{emp.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{emp.email}</p>
                    </div>

                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest leading-none">
                             {emp.role}
                          </span>
                          {emp.departmentId?.name && (
                             <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-100 uppercase tracking-widest leading-none">
                                {emp.departmentId.name}
                             </span>
                          )}
                       </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Reports To</p>
                     <p className="text-[10px] font-bold text-slate-700 truncate max-w-[100px] text-right">
                        {emp.reportingTo?.name || 'Admin'}
                     </p>
                  </div>
                  {emp.salary > 0 && (
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Salary</p>
                      <p className="text-[10px] font-bold text-blue-600">₹{emp.salary?.toLocaleString('en-IN')}/mo</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {employees.filter(e => e.role !== 'admin').length === 0 && (
              <div className="py-20 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Users className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-900">No team members yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">Invite your peers to start managing your organization.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'departments' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
            {departments.map(dept => {
              const deptMembers = employees.filter(e => e.departmentId?._id === dept._id || e.departmentId === dept._id);
              return (
                <div key={dept._id} className="bg-white border border-slate-100 rounded-xl p-5 hover:border-blue-200 hover:shadow-sm transition-all group cursor-pointer">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100">
                      <Building2 className="w-5 h-5" />
                    </div>
                    {canManage && (
                      <div className="flex gap-1 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingDept(dept);
                            setDeptForm({ name: dept.name, crmAccessLevel: dept.crmAccessLevel || 'none' });
                            setShowDeptModal(true);
                          }}
                          className="cursor-pointer p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {isOwner && (
                          <button 
                            onClick={() => handleDeleteDept(dept._id)}
                            className="cursor-pointer p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-all shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">{dept.name}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                        {deptMembers.length} Members
                      </span>
                    </div>
                    
                    <div className="flex -space-x-2">
                      {deptMembers.slice(0, 5).map((m, idx) => (
                        <div key={m._id} className="w-7 h-7 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-[8px] font-black text-slate-400 shadow-sm" title={m.name}>
                          {m.name[0]}
                        </div>
                      ))}
                      {deptMembers.length > 5 && (
                        <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                          +{deptMembers.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {departments.length === 0 && (
              <div className="col-span-full py-24 text-center">
                 <div className="w-14 h-14 bg-slate-50 rounded-[24px] flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Building2 className="w-7 h-7 text-slate-300" />
                 </div>
                 <p className="text-sm font-bold text-slate-900">No departments defined</p>
                 <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">Create offices or organizational units to group your team.</p>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applicant</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type & Reason</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                {(canManage || user?.role === 'teamhead') && <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaves.map(leave => (
                <tr key={leave._id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-[10px]">
                        {leave.userId?.name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{leave.userId?.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{leave.userId?.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-gray-700">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold">
                       {Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} Days
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-100 mb-1 inline-block">
                      {leave.type}
                    </span>
                    <p className="text-[10px] text-gray-500 line-clamp-1">{leave.reason}</p>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${
                      leave.status === 'approved' ? 'bg-green-50 text-green-600 border border-green-100' :
                      leave.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-100' :
                      'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {leave.status === 'pending' && (canManage || user?.role === 'teamhead') && (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleProcessLeave(leave._id, 'approved')}
                          className="cursor-pointer w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button 
                           onClick={() => handleProcessLeave(leave._id, 'rejected')}
                          className="cursor-pointer w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                       <Clock className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                       <p className="text-xs text-gray-400 font-medium">No leave applications to display.</p>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Invitation Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-100 p-6 sm:p-8 custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  {editingEmp ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">{editingEmp ? 'Modify Profile' : 'Invite Peer'}</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{editingEmp ? 'Update member details' : 'Add a new seat to workspace'}</p>
                </div>
              </div>
              <button onClick={() => {
                setShowInviteModal(false);
                setEditingEmp(null);
                setEmpForm({ name: '', email: '', password: '', role: 'employee', designation: '', departmentId: '', reportingTo: '', salary: '', phone: '', gender: '' });
              }} className="cursor-pointer w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 transition-colors">×</button>
            </div>
            
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Full Name</label>
                <input className="input-field h-11 px-4 bg-gray-50 border-gray-100" placeholder="Sahil Khan" value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} required />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Professional Email</label>
                <input className="input-field h-11 px-4 bg-gray-50 border-gray-100" type="email" placeholder="sahil@company.com" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Set Password (Direct)</label>
                  <input type="password" Name="password" className="input-field h-11 px-4 bg-gray-50 border-gray-100" placeholder="••••••••" value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Designation</label>
                  <input className="input-field h-11 px-4 bg-gray-50 border-gray-100" placeholder="Senior Dev" value={empForm.designation} onChange={e => setEmpForm({...empForm, designation: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Base Salary (Monthly)</label>
                <input 
                  type="number" 
                  className="input-field h-11 px-4 bg-gray-50 border-gray-100" 
                  placeholder="E.g. 25000" 
                  value={empForm.salary} 
                  onChange={e => setEmpForm({...empForm, salary: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Phone Number</label>
                  <input className="input-field h-11 px-4 bg-gray-50 border-gray-100" placeholder="9876543210" value={empForm.phone} onChange={e => setEmpForm({...empForm, phone: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Gender</label>
                  <select className="input-field h-11 px-4 bg-gray-50 border-gray-100" value={empForm.gender} onChange={e => setEmpForm({...empForm, gender: e.target.value})}>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Access Level (Role)</label>
                  <select className="input-field h-11 px-4 bg-gray-50 border-gray-100" value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value})}>
                    {ROLES.map(r => <option key={r} value={r}>{r === 'teamhead' ? 'TEAM HEAD' : r.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Reports To (Boss)</label>
                  <select 
                    className="input-field h-11 px-4 bg-gray-50 border-gray-100" 
                    value={empForm.reportingTo} 
                    onChange={e => setEmpForm({...empForm, reportingTo: e.target.value})}
                  >
                    <option value="">Admin (Direct)</option>
                    {employees
                      .filter(e => ['manager', 'teamhead', 'hr'].includes(e.role) && e._id !== empForm._id)
                      .map(e => (
                        <option key={e._id} value={e._id}>
                          {e.name} ({e.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Home Dept</label>
                <select 
                  className="input-field h-11 px-4 bg-gray-50 border-gray-100 placeholder:text-slate-400" 
                  value={empForm.departmentId} 
                  onChange={e => setEmpForm({...empForm, departmentId: e.target.value})} 
                  required={!['admin', 'hr', 'manager'].includes(empForm.role)}
                >
                  {loading ? (
                    <option value="">Loading Departments...</option>
                  ) : departments.length === 0 ? (
                    <option value="">No Departments Found</option>
                  ) : (
                    <>
                      <option value="">{['admin', 'hr', 'manager'].includes(empForm.role) ? 'All Access (Optional)' : 'Choose a Department...'}</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </>
                  )}
                </select>
              </div>
              <button type="submit" className="cursor-pointer w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 mt-4" disabled={loading}>
                {loading ? 'Processing...' : (editingEmp ? 'Save Changes & Update Role' : (empForm.password ? 'Add Member Directly' : 'Securely Dispatch Invitation'))}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Leave Application Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto border border-slate-100 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Apply Leave</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Submit request to manager</p>
                  </div>
                </div>
                <button onClick={() => setShowLeaveModal(false)} className="cursor-pointer w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100">×</button>
              </div>

              <form onSubmit={handleApplyLeave} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Leave Category</label>
                  <select className="input-field h-11 px-4 bg-gray-50 border-gray-100" value={leaveForm.type} onChange={e => setLeaveForm({...leaveForm, type: e.target.value})}>
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="earned">Earned Leave</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Start Date</label>
                    <input type="date" className="input-field h-11 px-4 bg-gray-50 border-gray-100" value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm, startDate: e.target.value})} required />
                   </div>
                   <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">End Date</label>
                    <input type="date" className="input-field h-11 px-4 bg-gray-50 border-gray-100" value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm, endDate: e.target.value})} required />
                   </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Explain Reason</label>
                  <textarea rows="3" className="input-field p-4 bg-gray-50 border-gray-100 resize-none" placeholder="Brief explanation..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} required />
                </div>
                <button type="submit" className="cursor-pointer w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 mt-4 transition-all">
                  Submit Request
                </button>
              </form>
           </div>
        </div>
      )}

      {/* Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto border border-slate-100 p-6 sm:p-8">
             <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                   {editingDept ? <Pencil className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">{editingDept ? 'Edit Department' : 'New Department'}</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{editingDept ? 'Update department details' : 'Define a new organizational unit'}</p>
                </div>
              </div>
              <button onClick={() => {
                setShowDeptModal(false);
                setEditingDept(null);
                setDeptForm({ name: '', crmAccessLevel: 'none' });
              }} className="cursor-pointer w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 transition-colors">×</button>
            </div>
            
            <form onSubmit={handleCreateDept} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">Unit Headline Name</label>
                <input className="input-field h-12 px-4 bg-gray-50 border-gray-100" placeholder="E.g. Engineering" value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} required />
              </div>
              <button type="submit" className="cursor-pointer w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-[0.98] transition-all disabled:opacity-50 mt-4" disabled={loading}>
                {loading ? 'Deploying...' : (editingDept ? 'Commit System Changes' : 'Confirm System Update')}
              </button>
            </form>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <ConfirmModal 
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={confirmDelete}
            title={deleteType === 'member' ? "Remove Member" : "Delete Department"}
            message={deleteType === 'member' 
                ? "Are you sure you want to remove this member from the organization?" 
                : "Are you sure you want to delete this department? This may affect assigned members."}
        />
      )}
    </div>
  );
}

export default HRM;