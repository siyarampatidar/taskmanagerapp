import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Calendar, 
  Flag, 
  User, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  ListTodo,
  FileUp,
  Download,
  FileText,
  Video,
  FileSpreadsheet,
  XCircle,
  MessageSquare,
  Briefcase,
  Trash2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { fetchTasks, createTask, updateTaskStatus, transferTaskToDepartment, approveTaskState, reassignTask, updateSubTask, acceptTask, rejectTask, fetchArchivedTasks, restoreTask, deleteTask, addTaskAttachment } from '../redux/slices/taskSlice';
import { fetchDepartments } from '../redux/slices/hrSlice';
import { 
  ArrowRightLeft, 
  History, 
  CheckCircle, 
  ShieldCheck, 
  UserCheck 
} from 'lucide-react';
import { fetchLeads } from '../redux/slices/crmSlice';
import { toast } from 'react-hot-toast';
import { fetchEmployees } from '../redux/slices/hrSlice';
import { TasksSkeleton } from '../components/common/Skeleton';
import { useDispatch, useSelector } from 'react-redux';
import ConfirmModal from '../components/common/ConfirmModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const STATUS_CONFIG = {
  todo: { label: 'To Do', color: 'text-gray-500', bg: 'bg-gray-100', icon: Clock },
  inprogress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50', icon: ChevronRight },
  revision: { label: 'Revision', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
  inreview: { label: 'In Review', color: 'text-purple-600', bg: 'bg-purple-50', icon: History },
  completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
};

const PRIORITY_CONFIG = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-amber-600 bg-amber-50',
  high: 'text-orange-600 bg-orange-50',
  urgent: 'text-red-600 bg-red-50',
};

const STATUS_KEYS = ['todo', 'inprogress', 'revision', 'inreview', 'completed'];

const Tasks = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { tasks, loading, archivedTasks } = useSelector((state) => state.tasks);
  const { employees } = useSelector((state) => state.hr);
  const [viewArchived, setViewArchived] = useState(false);
  const { user } = useAuth();
  
  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchEmployees());
    dispatch(fetchDepartments());
    dispatch(fetchLeads());
  }, [dispatch]);

  const { departments } = useSelector(state => state.hr);
  const { leads } = useSelector(state => state.crm);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignUserId, setReassignUserId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const selectedTask = tasks.find(t => t._id === selectedTaskId);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    deadline: '', 
    assignedTo: '',
    targetDeptId: '',
    assignmentType: 'individual', // 'individual' or 'department'
    subTasks: [],
    leadId: ''
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [transferDept, setTransferDept] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showTaskLog, setShowTaskLog] = useState(false);
  const [delegateTo, setDelegateTo] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [taskToReject, setTaskToReject] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [taskToConfirm, setTaskToConfirm] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToArchive, setTaskToArchive] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isAddingFiles, setIsAddingFiles] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionData, setRevisionData] = useState({ type: '', note: '' });

  const toggleArchives = () => {
    if (!viewArchived) dispatch(fetchArchivedTasks());
    setViewArchived(!viewArchived);
  };

  const handleArchive = (id) => {
    setTaskToArchive(id);
    setShowDeleteModal(true);
  };

  const confirmArchive = async () => {
    if (!taskToArchive) return;
    const res = await dispatch(deleteTask(taskToArchive));
    if (deleteTask.fulfilled.match(res)) toast.success('Task archived');
    else toast.error('Failed to archive');
    setTaskToArchive(null);
  };

  const handleRestore = async (id) => {
    const res = await dispatch(restoreTask(id));
    if (restoreTask.fulfilled.match(res)) toast.success('Task restored');
    else toast.error('Failed to restore');
  };
  const [files, setFiles] = useState([]);
// Removed local useSocket

  const userDeptId = (user?.departmentId?._id || user?.departmentId)?.toString();
  const userDept = departments.find(d => d._id?.toString() === userDeptId);
  const deptName = user?.departmentId?.name || userDept?.name || '';
  
  const isSalesOrMarketing = 
    ['sales', 'marketing'].includes(user?.role?.toLowerCase()) || 
    deptName.toLowerCase().includes('sales') || 
    deptName.toLowerCase().includes('marketing');

  const canAssign = ['admin', 'manager', 'teamhead', 'hr'].includes(user?.role?.toLowerCase()) || isSalesOrMarketing;

  const handleToggleSubtask = async (taskId, subTaskId, currentStatus) => {
    const result = await dispatch(updateSubTask({ taskId, subTaskId, isDone: !currentStatus }));
    if (!updateSubTask.fulfilled.match(result)) {
      toast.error(result.payload || 'Failed to update subtask');
    }
  };

  const handleAttachFiles = async () => {
    if (!selectedFiles.length || !selectedTaskId) return;
    setIsAddingFiles(true);
    try {
      await dispatch(addTaskAttachment({ taskId: selectedTaskId, attachments: selectedFiles })).unwrap();
      toast.success('Attachments added successfully');
      setSelectedFiles([]);
    } catch (err) {
      toast.error(err || 'Failed to add attachments');
    } finally {
      setIsAddingFiles(false);
    }
  };

  // SOCKET LISTENERS removed - now handled in socketMiddleware

  const handleAcceptTask = async (taskId) => {
    try {
      await dispatch(acceptTask(taskId)).unwrap();
      toast.success('Task Accepted!');
    } catch (error) {
      toast.error(error?.message || 'Failed to accept task');
    }
  };

  const handleRejectTask = async () => {
    if (!rejectReason) return toast.error('Please provide a reason');
    try {
      await dispatch(rejectTask({ taskId: taskToReject._id, reason: rejectReason })).unwrap();
      setShowRejectModal(false);
      setRejectReason('');
      setTaskToReject(null);
      toast.success('Task Rejected');
    } catch (error) {
      toast.error(error?.message || 'Failed to reject task');
    }
  };

  const handleStatusUpdateWithConfirm = async (taskId, status) => {
    if (status === 'inreview') {
        setTaskToConfirm({ id: taskId, status });
        setShowConfirmModal(true);
    } else {
        updateStatus(taskId, status);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('priority', form.priority);
    formData.append('deadline', form.deadline);
    if (form.assignmentType === 'individual') {
        formData.append('assignedTo', form.assignedTo || user?.id || user?._id);
    } else {
        formData.append('targetDeptId', form.targetDeptId);
    }
    if (form.leadId) formData.append('leadId', form.leadId);
    formData.append('subTasks', JSON.stringify(form.subTasks));
    
    files.forEach(file => {
      formData.append('attachments', file);
    });

    const result = await dispatch(createTask(formData));
    if (createTask.fulfilled.match(result)) {
      toast.success('Task created successfully!');
      setShowAddModal(false);
      setForm({ title: '', description: '', priority: 'medium', deadline: '', assignedTo: '', subTasks: [], leadId: '' });
      setFiles([]);
    } else {
      toast.error(result.payload || 'Failed to create task');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await dispatch(updateTaskStatus({ taskId: id, status })).unwrap();
      toast.success(`Task status updated to ${status}`);
    } catch (error) {
      toast.error(error?.message || 'Failed to update status');
    }
  };

  const handleApproveState = async (approvalType, status, revisionNote) => {
    const result = await dispatch(approveTaskState({ taskId: selectedTask._id, approvalType, status, revisionNote }));
    if (approveTaskState.fulfilled.match(result)) {
      toast.success(status === 'rejected' ? 'Revision requested' : `Task ${status} by ${approvalType}`);
      setShowRevisionModal(false);
      setRevisionData({ type: '', note: '' });
    } else {
      toast.error(result.payload || 'Approval failed');
    }
  };

  const handleTransfer = async () => {
    if (!transferDept) return;
    const result = await dispatch(transferTaskToDepartment({ taskId: selectedTask._id, deptId: transferDept }));
    if (transferTaskToDepartment.fulfilled.match(result)) {
      toast.success('Task transferred to department');
      setTransferDept('');
    } else {
      toast.error(result.payload || 'Transfer failed');
    }
  };

  const handleDelegate = async () => {
    if (!delegateTo) return;
    const result = await dispatch(reassignTask({ taskId: selectedTask._id, assigneeId: delegateTo }));
    if (reassignTask.fulfilled.match(result)) {
      toast.success('Task delegated to member');
      setDelegateTo('');
    } else {
      toast.error(result.payload || 'Delegation failed');
    }
  };

  const handleReassign = async () => {
    if (!reassignUserId || !selectedTask) return;
    setActionLoading(true);
    try {
      await dispatch(reassignTask({ taskId: selectedTask._id, assigneeId: reassignUserId })).unwrap();
      toast.success('Mission reassigned successfully');
      setShowReassignModal(false);
      setSelectedTaskId(null);
    } catch (err) {
      toast.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setForm({ ...form, subTasks: [...form.subTasks, { title: newSubtask, isDone: false }] });
    setNewSubtask('');
  };

  const groupedTasks = STATUS_KEYS.reduce((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status);
    return acc;
  }, {});

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    handleStatusUpdateWithConfirm(draggableId, newStatus);
  };

  if (loading) return <TasksSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mission Control</h1>
          <p className="text-xs text-slate-500 font-medium">Track and execute your team's objectives in real-time.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={toggleArchives} 
            className={`cursor-pointer btn-secondary flex items-center gap-2 px-4 py-2 text-xs border-slate-200 group transition-all ${
              viewArchived ? 'bg-amber-600 border-amber-600 text-white' : ''
            }`}
          >
            <ShieldCheck className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>{viewArchived ? 'Active Missions' : 'Archives'}</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="cursor-pointer btn-primary flex items-center gap-2 px-4 py-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Mission</span>
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {STATUS_KEYS.map(status => (
            <Droppable key={status} droppableId={status}>
              {(provided) => (
                <div 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex-shrink-0 w-72 space-y-3"
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${STATUS_CONFIG[status].color}`}>
                        {STATUS_CONFIG[status].label}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                        {groupedTasks[status]?.length || 0}
                      </span>
                    </div>
                    <button className="cursor-pointer text-gray-400 hover:text-gray-600"><Plus className="w-3.5 h-3.5" /></button>
                  </div>

                  <div className="space-y-3 min-h-[500px]">
                    {groupedTasks[status]?.map((task, index) => (
                      <Draggable key={task._id} draggableId={task._id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedTaskId(task._id)}
                            className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
                              snapshot.isDragging ? 'shadow-2xl border-blue-500 scale-105 z-[100]' : ''
                            } ${
                              task.status === 'completed' 
                                ? 'border-green-100 bg-green-50/20' 
                                : task.acceptanceStatus === 'rejected'
                                  ? 'border-red-200 bg-red-50/30'
                                  : task.status === 'revision'
                                    ? 'border-amber-200 bg-amber-50/40 shadow-sm shadow-amber-50'
                                    : task.transferredFromDept 
                                      ? 'border-blue-100 bg-blue-50/10' 
                                      : 'border-slate-100 bg-white'
                            } hover:border-blue-400 hover:shadow-sm`}
                          >
                            {/* Priority colored top border */}
                            <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${
                              task.priority === 'urgent' ? 'bg-red-500' :
                              task.priority === 'high' ? 'bg-orange-400' :
                              task.priority === 'medium' ? 'bg-amber-400' : 'bg-green-400'
                            }`} />

                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${PRIORITY_CONFIG[task.priority]}`}>
                                {task.priority}
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleArchive(task._id); }}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                                title="Move to Archive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <h3 className="text-xs font-bold text-gray-900 mb-1.5 line-clamp-2">{task.title}</h3>

                            {task.leadId && (
                              <p className="text-[9px] text-blue-500 font-semibold mb-2 flex items-center gap-1 truncate">
                                <Briefcase className="w-2.5 h-2.5 flex-shrink-0" />
                                {task.leadId?.name || 'Linked Lead'}
                              </p>
                            )}

                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-blue-400" />
                                <span>{task.deadline ? new Date(task.deadline).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) : 'No date'}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-[8px] font-bold">
                                  {task.assignedTo?.name?.[0] || '?'}
                                </div>
                                <span className="text-[9px] font-medium text-gray-500 truncate max-w-[80px]">{task.assignedTo?.name || 'Unassigned'}</span>
                              </div>

                              {task.subTasks?.length > 0 && (
                                <div className="flex items-center gap-0.5">
                                  {task.subTasks.slice(0, 5).map((st, i) => (
                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${ st.isDone ? 'bg-green-500' : 'bg-gray-200' }`} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {groupedTasks[status]?.length === 0 && (
                      <div className="h-24 border border-dashed border-gray-100 rounded-xl flex items-center justify-center text-[10px] text-gray-400 italic">
                        No tasks here
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_CONFIG[selectedTask.status].bg} ${STATUS_CONFIG[selectedTask.status].color}`}>
                    {STATUS_CONFIG[selectedTask.status].label}
                  </span>
                  {selectedTask.isApprovedByTeamHead && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                      <ShieldCheck className="w-3 h-3" /> TH Approved
                    </span>
                  )}
                  {selectedTask.isApprovedByManager && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">
                      <UserCheck className="w-3 h-3" /> Final Approved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowTaskLog(!showTaskLog)}
                    className={`cursor-pointer p-1.5 rounded-lg transition-colors ${showTaskLog ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                    title="View History Log"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setSelectedTaskId(null); setShowTaskLog(false); }} className="cursor-pointer text-gray-400 hover:text-gray-600">×</button>
                </div>
              </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">{selectedTask.title}</h2>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">{selectedTask.description || 'No description provided.'}</p>
                {selectedTask.acceptanceStatus === 'rejected' && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Rejection Reason</p>
                    <p className="text-xs text-red-700 italic">"{selectedTask.rejectionReason || 'No reason specified'}"</p>
                  </div>
                )}
                {selectedTask.status === 'revision' && selectedTask.revisionNote && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-1 flex items-center gap-2">
                       <AlertCircle className="w-3 h-3" /> Revision Feedback
                    </p>
                    <p className="text-xs text-amber-700 font-medium">"{selectedTask.revisionNote}"</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Assignee</p>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">{selectedTask.assignedTo?.name || 'Unassigned'}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Due Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">{selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : 'No date'}</span>
                  </div>
                </div>
                {selectedTask.teamHeadId && (
                  <div className="col-span-2 mt-2 pt-3 border-t border-gray-50/50">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">First Level Reviewer (Team Head)</p>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-gray-700">{selectedTask.teamHeadId?.name || 'Assigned Head'}</span>
                    </div>
                  </div>
                )}
                <div className="col-span-2 mt-4">
                  <button 
                    onClick={() => {
                        const targetId = (selectedTask.createdBy?._id || selectedTask.createdBy) === user?.id 
                            ? (selectedTask.assignedTo?._id || selectedTask.assignedTo) 
                            : (selectedTask.createdBy?._id || selectedTask.createdBy);
                        navigate(`/chat?dm=${targetId}`);
                    }}
                    className="cursor-pointer w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100 hover:bg-indigo-100 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Discuss Mission in Chat
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Subtasks</h4>
                <div className="space-y-2">
                  {selectedTask.subTasks?.map((st, i) => (
                    <div 
                      key={i} 
                      onClick={() => handleToggleSubtask(selectedTask._id, st._id, st.isDone)}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg group cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${st.isDone ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-200 group-hover:border-blue-400'}`}>
                        {st.isDone && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <span className={`text-xs ${st.isDone ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>{st.title}</span>
                    </div>
                  ))}
                  {(!selectedTask.subTasks || selectedTask.subTasks.length === 0) && (
                    <p className="text-xs text-gray-400 italic">No subtasks added.</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attachments</h4>
                  {((selectedTask.assignedTo?._id || selectedTask.assignedTo) === (user?.id || user?._id) || (selectedTask.createdBy?._id || selectedTask.createdBy) === (user?.id || user?._id)) && (
                    <div className="relative">
                      <input 
                        type="file" 
                        multiple 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          if (files.length) {
                            setSelectedFiles(files);
                          }
                        }}
                      />
                      <button className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors flex items-center gap-1">
                        <Plus className="w-2.5 h-2.5" /> Add More
                      </button>
                    </div>
                  )}
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-blue-700">{selectedFiles.length} new file(s) selected</span>
                      <button onClick={() => setSelectedFiles([])} className="text-slate-400 hover:text-red-500"><Plus className="w-3 h-3 rotate-45" /></button>
                    </div>
                    <button 
                      onClick={handleAttachFiles}
                      disabled={isAddingFiles}
                      className="w-full py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm shadow-blue-100 disabled:bg-blue-300"
                    >
                      {isAddingFiles ? 'Uploading...' : 'Confirm Upload'}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {selectedTask.attachments?.map((url, i) => {
                    const ext = url.split('.').pop().toLowerCase();
                    const isVideo = ['mp4', 'mov', 'avi', 'mkv'].includes(ext);
                    const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
                    return (
                      <div 
                        key={i} 
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-300 transition-colors group"
                      >
                        {isVideo ? <Video className="w-4 h-4 text-purple-500" /> : 
                         isExcel ? <FileSpreadsheet className="w-4 h-4 text-green-600" /> : 
                         <FileText className="w-4 h-4 text-blue-500" />}
                        <span className="text-[10px] font-medium text-gray-700 truncate flex-1">File {i+1}</span>
                        <div className="flex items-center gap-1">
                          <a 
                            href={url.startsWith('http') ? url : `${import.meta.env.VITE_BACKEND_URL}/${url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-500 transition-all"
                            title="View"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </a>
                          <button 
                            onClick={() => {
                               const fileUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_BACKEND_URL}/${url}`;
                               const downloadUrl = fileUrl.includes('cloudinary.com') 
                                 ? fileUrl.replace('/upload/', '/upload/fl_attachment/')
                                 : fileUrl;
                               window.open(downloadUrl, '_blank');
                            }}
                            className="cursor-pointer p-1.5 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-500 transition-all"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(!selectedTask.attachments || selectedTask.attachments.length === 0) && (
                    <p className="text-[10px] text-gray-400 italic col-span-2">No attachments found.</p>
                  )}
                </div>
              </div>

              {/* Advanced Workflow: Transfer */}
              {['admin', 'manager', 'teamhead', 'hr', 'sales', 'marketing'].includes(user?.role) && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                    <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Department Transfer</h4>
                    {selectedTask.acceptanceStatus !== 'pending' && <span className="text-[8px] text-amber-600 font-bold ml-auto">* Task already accepted</span>}
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className="input-field py-1.5 text-xs bg-white border-blue-200"
                      value={transferDept}
                      onChange={(e) => setTransferDept(e.target.value)}
                    >
                      <option value="">Move to Department...</option>
                      {departments.filter(d => d._id !== user?.departmentId).map(d => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleTransfer}
                      disabled={!transferDept || (selectedTask.acceptanceStatus !== 'pending' && !['admin', 'manager'].includes(user?.role?.toLowerCase()))}
                      className="cursor-pointer btn-primary px-4 text-xs whitespace-nowrap disabled:bg-blue-300"
                    >
                      Transfer
                    </button>
                  </div>
                </div>
              )}

              {/* Delegation Section - For Team Heads/Managers to assign to their members */}
              {['admin', 'manager', 'teamhead', 'hr', 'sales', 'marketing'].includes(user?.role) && selectedTask.assignedTo?._id === (user?.id || user?._id) && (
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <h4 className="text-[10px] font-bold text-purple-700 uppercase tracking-widest">Delegate to Team Member</h4>
                  </div>
                  <div className="flex gap-2">
                    <select 
                      className="input-field py-1.5 text-xs bg-white border-purple-200"
                      value={delegateTo}
                      onChange={(e) => setDelegateTo(e.target.value)}
                    >
                      <option value="">Select Member...</option>
                      {/* Filter employees: only those who report to this user or are in the same department as the task */}
                      {employees
                        .filter(emp => emp._id !== user?.id && emp._id !== user?._id && !['admin', 'manager', 'hr', 'superadmin'].includes(emp.role?.toLowerCase()))
                        .map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleDelegate}
                      disabled={!delegateTo}
                      className="cursor-pointer bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold disabled:bg-purple-300 transition-all shadow-sm shadow-purple-100"
                    >
                      Delegate
                    </button>
                  </div>
                </div>
              )}

              {/* History View Overlay - Available for all involved users */}
              {showTaskLog && (
                <div className="mt-4 bg-slate-50 rounded-2xl p-5 max-h-72 overflow-y-auto custom-scrollbar border border-slate-200">
                  <div className="flex items-center justify-between mb-5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                       <History className="w-3.5 h-3.5 text-blue-600" /> Mission Audit Log (Full Trace)
                    </h4>
                  </div>
                  <div className="space-y-5 relative">
                    {/* Vertical Line Connector */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200" />
                    
                    {selectedTask.activityLog?.slice().reverse().map((log, i) => (
                      <div key={i} className="relative pl-7 group">
                        {/* Status Circle */}
                        <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10 group-hover:border-blue-500 transition-colors">
                          <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-slate-300'}`} />
                        </div>
                        
                        <div className="bg-white rounded-xl p-2.5 border border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/30 transition-all shadow-sm">
                          <p className="text-[11px] text-slate-800 font-bold leading-tight mb-1">{log.action || log.note}</p>
                          <p className="text-[9px] text-slate-400 flex items-center justify-between opacity-80">
                            <span className="flex items-center gap-1.5 font-medium">
                               <User className="w-2.5 h-2.5" /> {log.userId?.name || 'Identity Unknown'}
                            </span>
                            <span className="tabular-nums font-bold">{new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!selectedTask.activityLog || selectedTask.activityLog.length === 0) && (
                      <p className="text-[10px] text-slate-400 italic text-center py-4 font-medium">No activity log found for this mission.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 border-t border-gray-50 pt-4 flex flex-col gap-3">
                {/* Assignee Actions */}
                {((selectedTask.assignedTo?._id || selectedTask.assignedTo) === (user?.id || user?._id)) && (
                  <div className="flex gap-2">
                    {selectedTask.acceptanceStatus === 'pending' && (
                      <div className="flex gap-2 flex-1">
                        <button onClick={() => handleAcceptTask(selectedTask._id)} className="cursor-pointer bg-green-600 text-white flex-1 py-2.5 rounded-xl text-[10px] font-bold shadow-lg shadow-green-100">Accept Mission</button>
                        <button onClick={() => { setTaskToReject(selectedTask); setShowRejectModal(true); }} className="cursor-pointer bg-red-50 text-red-600 border border-red-100 flex-1 py-2.5 rounded-xl text-[10px] font-bold">Reject</button>
                      </div>
                    )}
                    {selectedTask.acceptanceStatus === 'accepted' && selectedTask.status === 'todo' && (
                      <button onClick={() => updateStatus(selectedTask._id, 'inprogress')} className="cursor-pointer btn-primary flex-1 py-2.5 text-[10px]">Start Task</button>
                    )}
                    {selectedTask.status === 'inprogress' && (
                      <button onClick={() => handleStatusUpdateWithConfirm(selectedTask._id, 'inreview')} className="cursor-pointer bg-purple-600 text-white flex-1 py-2.5 rounded-xl text-[10px] font-bold shadow-lg shadow-purple-100">Submit for Review</button>
                    )}
                    {selectedTask.status === 'revision' && (
                      <button onClick={() => handleStatusUpdateWithConfirm(selectedTask._id, 'inreview')} className="cursor-pointer bg-amber-600 text-white flex-1 py-2.5 rounded-xl text-[10px] font-bold shadow-lg shadow-amber-100">Resubmit for Review</button>
                    )}
                  </div>
                )}

                {selectedTask.acceptanceStatus === 'rejected' && ((selectedTask.createdBy?._id || selectedTask.createdBy) === (user?.id || user?._id)) && (
                  <button 
                    onClick={() => { 
                      setReassignUserId(selectedTask.assignedTo?._id || selectedTask.assignedTo);
                      setShowReassignModal(true);
                    }} 
                    className="cursor-pointer bg-blue-600 text-white w-full py-2.5 rounded-xl text-[10px] font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    <ArrowRightLeft className="w-4 h-4" /> Resolve & Reassign Mission
                  </button>
                )}

                {/* Team Head Approval - Only for the specific Team Head assigned to this task */}
                {['admin', 'manager', 'teamhead', 'hr', 'sales', 'marketing'].includes(user?.role) && 
                  ((selectedTask.teamHeadId?._id || selectedTask.teamHeadId) === (user?.id || user?._id)) && (
                  <div className="flex flex-col gap-2">
                    {selectedTask.status === 'inreview' && !selectedTask.isApprovedByTeamHead && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApproveState('teamhead', 'approved')}
                          className="cursor-pointer bg-blue-600 text-white flex-1 py-2.5 rounded-xl text-[10px] font-bold shadow-lg shadow-blue-100"
                        >
                          Verify as Team Head ✅
                        </button>
                        <button 
                          onClick={() => {
                            setRevisionData({ type: 'teamhead', note: '' });
                            setShowRevisionModal(true);
                          }}
                          className="cursor-pointer bg-red-50 text-red-600 border border-red-100 flex-1 py-2.5 rounded-xl text-[10px] font-bold"
                        >
                          Request Changes ❌
                        </button>
                      </div>
                    )}
                    {selectedTask.status === 'revision' && (
                      <button 
                        onClick={() => handleApproveState('teamhead', 'approved')}
                        className="cursor-pointer bg-blue-600 text-white w-full py-2.5 rounded-xl text-[10px] font-bold shadow-lg shadow-blue-100"
                      >
                        Submit Fixed Task to Assigner 🚀
                      </button>
                    )}
                  </div>
                )}

                {/* Manager/Assigner Final Approval */}
                {selectedTask.status === 'inreview' && 
                 (!selectedTask.teamHeadId || selectedTask.isApprovedByTeamHead) && 
                 !selectedTask.isApprovedByManager && 
                 ((selectedTask.createdBy?._id || selectedTask.createdBy) === (user?.id || user?._id) || ['admin', 'manager'].includes(user?.role)) && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApproveState('assigner', 'approved')}
                      className="cursor-pointer bg-green-600 text-white flex-1 py-2.5 rounded-xl text-[10px] font-bold shadow-lg shadow-green-100"
                    >
                      Final Approval & Close 🏆
                    </button>
                    <button 
                      onClick={() => {
                        setRevisionData({ type: 'assigner', note: '' });
                        setShowRevisionModal(true);
                      }}
                      className="cursor-pointer bg-red-50 text-red-600 border border-red-100 px-4 py-2.5 rounded-xl text-[10px] font-bold"
                    >
                      Reject ❌
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden border border-slate-100">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-sm font-bold text-gray-900">Create New Task</h2>
              <button onClick={() => setShowAddModal(false)} className="cursor-pointer text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Title</label>
                <input className="input-field" placeholder="What needs to be done?" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Description</label>
                <textarea className="input-field h-20" placeholder="Briefly describe the task goals..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Priority</label>
                  <select className="input-field" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    {Object.keys(PRIORITY_CONFIG).map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Deadline</label>
                  <input className="input-field" type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                </div>
              </div>
              {canAssign && (
                <div className="space-y-4">
                  <div className="cursor-pointer flex gap-4 p-1 bg-gray-50 rounded-xl border border-gray-100">
                    <button 
                      type="button"
                      onClick={() => setForm({...form, assignmentType: 'individual'})}
                      className={`cursor-pointer flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${form.assignmentType === 'individual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                    >
                      Assign to Staff
                    </button>
                    <button 
                      type="button"
                      onClick={() => setForm({...form, assignmentType: 'department'})}
                      className={`cursor-pointer flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${form.assignmentType === 'department' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
                    >
                      Assign to Department Head
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {form.assignmentType === 'individual' ? (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Assign To Staff</label>
                        <select className="input-field" value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})}>
                          <option value="">Myself</option>
                          {employees
                            .filter(emp => !['admin', 'manager', 'hr', 'superadmin'].includes(emp.role?.toLowerCase()))
                            .map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>)}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Select Department Head</label>
                        <select className="input-field" value={form.targetDeptId} onChange={e => setForm({...form, targetDeptId: e.target.value})}>
                          <option value="">Choose Department...</option>
                          {departments.filter(d => 
                            d.managerId || 
                            employees.some(emp => {
                              const empDeptId = emp.departmentId?._id || emp.departmentId;
                              return empDeptId === d._id && emp.role !== 'employee';
                            })
                          ).map(d => <option key={d._id} value={d._id}>{d.name} Unit</option>)}
                        </select>
                        {departments.length > 0 && departments.filter(d => 
                          !d.managerId && 
                          !employees.some(emp => emp.departmentId?._id === d._id && emp.role !== 'employee')
                        ).length > 0 && (
                          <p className="text-[9px] text-amber-500 mt-1 italic font-medium">* Note: Departments without a Head (Manager/Team Head/Specialist) are hidden.</p>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Link to Approved Project</label>
                      <select className="input-field" value={form.leadId} onChange={e => setForm({...form, leadId: e.target.value})}>
                        <option value="">None / Standalone</option>
                        {leads.filter(l => l.approvalStatus === 'approved').map(lead => (
                          <option key={lead._id} value={lead._id}>{lead.name} ({lead.company})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Attachments (PDF, Video, Excel, Doc)</label>
                <div className="relative">
                  <input 
                    type="file" 
                    multiple 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={e => setFiles([...files, ...Array.from(e.target.files)])} 
                  />
                  <div className="input-field flex items-center gap-2 text-gray-400">
                    <FileUp className="w-4 h-4" />
                    <span>{files.length > 0 ? `${files.length} files selected` : 'Click to upload files'}</span>
                  </div>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {files.map((f, i) => (
                      <span key={i} className="bg-blue-50 text-blue-600 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1">
                        {f.name.slice(0, 10)}... 
                        <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Subtasks</label>
                <div className="flex gap-2 mb-2">
                  <input className="input-field py-1 text-xs" placeholder="Add subtask..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())} />
                  <button type="button" onClick={addSubtask} className="cursor-pointer bg-gray-100 p-1.5 rounded-lg text-gray-600 hover:bg-gray-200"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {form.subTasks.map((st, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg text-[10px] font-medium text-gray-600">
                      <div className="w-1 h-1 bg-blue-400 rounded-full" />
                      <span>{st.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="cursor-pointer btn-primary w-full h-10 mt-2" disabled={loading}>
                {loading ? 'Creating...' : 'Launch Task'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden border border-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                   <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                     <History className="w-5 h-5" />
                   </div>
                   Mission History
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">Review all completed and archived objectives.</p>
              </div>
              <button 
                onClick={() => setShowHistory(false)} 
                className="cursor-pointer w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 gap-4">
                {tasks.filter(t => ['completed', 'revision'].includes(t.status)).length > 0 ? (
                  tasks.filter(t => ['completed', 'revision'].includes(t.status))
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    .map(task => (
                      <div key={task._id} className="group bg-slate-50/50 border border-slate-100 rounded-2xl p-4 hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50/20 transition-all duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {task.status === 'completed' ? 'Success' : 'Archived / Revision'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(task.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{task.title}</h3>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{task.description}</p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:px-6 border-slate-100">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigner</span>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                  {task.createdBy?.name?.[0] || 'S'}
                                </div>
                                <span className="text-xs font-bold text-slate-700">{task.createdBy?.name || 'System'}</span>
                              </div>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assignee</span>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 border border-blue-200">
                                  {task.assignedTo?.name?.[0] || '?'}
                                </div>
                                <span className="text-xs font-bold text-slate-700">{task.assignedTo?.name || 'Unassigned'}</span>
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              setSelectedTaskId(task._id);
                              setShowHistory(false);
                            }}
                            className="cursor-pointer   bg-white p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg transition-all"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-4">
                      <History className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">No History Found</h3>
                    <p className="text-xs text-slate-500 max-w-[200px] mx-auto mt-1">Complete more missions to see them documented here.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowHistory(false)}
                className="cursor-pointer px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-red-100">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Mission</h3>
              <p className="text-xs text-gray-500 mb-4">Please provide a reason for rejecting this task. This will be sent back to the creator.</p>
              <textarea 
                className="input-field h-24 text-xs" 
                placeholder="e.g., Already busy with other tasks, missing details..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="cursor-pointer flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleRejectTask} className="cursor-pointer flex-1 py-2 text-xs font-bold bg-red-600 text-white rounded-lg shadow-lg shadow-red-100">Reject Task</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-purple-100">
            <div className="p-6">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Submit for Review?</h3>
              <p className="text-xs text-gray-500 mb-6">Are you sure you want to submit this task for manager review? Make sure all subtasks are checked.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="cursor-pointer flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">Wait, Go Back</button>
                <button 
                    onClick={() => { 
                        updateStatus(taskToConfirm.id, taskToConfirm.status); 
                        setShowConfirmModal(false); 
                    }} 
                    className="cursor-pointer flex-1 py-2 text-xs font-bold bg-purple-600 text-white rounded-lg shadow-lg shadow-purple-100"
                >
                    Yes, Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-blue-100 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <ArrowRightLeft className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Reassign Mission</h3>
              <p className="text-xs text-gray-500 mb-4">The issue has been resolved? Choose who should take this mission forward. You can pick the same member or a new one.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">New Assignee</label>
                  <select 
                    className="input-field text-xs" 
                    value={reassignUserId} 
                    onChange={(e) => setReassignUserId(e.target.value)}
                  >
                    <option value="">Choose Agent...</option>
                    {employees
                      .filter(emp => !['admin', 'manager', 'hr', 'superadmin'].includes(emp.role?.toLowerCase()))
                      .map(emp => (
                        <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowReassignModal(false)} 
                  className="cursor-pointer flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReassign}
                  disabled={!reassignUserId || actionLoading}
                  className="cursor-pointer flex-1 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-100 disabled:bg-blue-300"
                >
                  {actionLoading ? 'Processing...' : 'Reassign Mission'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Revision Reason Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-amber-100">
            <div className="p-6">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Request Revision</h3>
              <p className="text-xs text-gray-500 mb-4">What changes are required? Please provide detailed feedback so the agent can fix the mission.</p>
              <textarea 
                className="input-field h-32 text-xs py-3" 
                placeholder="e.g., Please update the document formatting and add the missing stats for Q3..."
                value={revisionData.note}
                onChange={(e) => setRevisionData({...revisionData, note: e.target.value})}
                autoFocus
              />
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => { setShowRevisionModal(false); setRevisionData({ type: '', note: '' }); }} 
                  className="cursor-pointer flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleApproveState(revisionData.type, 'rejected', revisionData.note)} 
                  disabled={!revisionData.note.trim()}
                  className="cursor-pointer flex-1 py-2 text-xs font-bold bg-amber-600 text-white rounded-lg shadow-lg shadow-amber-100 disabled:bg-amber-300"
                >
                  Send Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <ConfirmModal 
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmArchive}
          title="Archive Task"
          message="Are you sure you want to move this task to the archive? You can restore it later from the Archives section."
        />
      )}
    </div>
  );
};

export default Tasks;
