import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Hash, 
  Users, 
  Settings, 
  ChevronRight, 
  Globe, 
  Lock, 
  Trash2, 
  PlusSquare,
  Search,
  X,
  LayoutGrid,
  ShieldCheck,
  MoreVertical,
  Activity,
  Zap,
  Target,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchProjects, createProject } from '../redux/slices/projectSlice';
import { fetchChannels, setActiveChannelId } from '../redux/slices/chatSlice';
import { fetchEmployees } from '../redux/slices/hrSlice';
import { useAuth } from '../hooks/useAuth';
import { apiConnector } from '../Services/apiConnector';
import { chatEndpoints } from '../Services/apis';
import toast from 'react-hot-toast';

const Projects = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projects, loading } = useSelector((state) => state.projects);
  const { channels } = useSelector((state) => state.chat);
  const { employees } = useSelector((state) => state.hr);
  const { user } = useAuth();
  
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newProject, setNewProject] = useState({ name: '', description: '', type: 'public', members: [] });
  const [editingProject, setEditingProject] = useState(null);
  const [newChannel, setNewChannel] = useState({ name: '', type: 'public', projectId: '', description: '', members: [] });

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchChannels());
    dispatch(fetchEmployees());
  }, [dispatch]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await dispatch(createProject(newProject)).unwrap();
      setShowCreateProject(false);
      setNewProject({ name: '', description: '', type: 'public', members: [] });
      toast.success('Project Created');
    } catch (err) {
      toast.error(err);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      // FIXED: Changed to projects/ (plural) to match backend
      const res = await apiConnector('PUT', `projects/${editingProject._id}`, editingProject);
      if (res.data.success) {
        dispatch(fetchProjects());
        setShowEditProject(false);
        toast.success('Updated');
      }
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      // FIXED: Changed to projects/ (plural) to match backend
      const res = await apiConnector('DELETE', `projects/${projectToDelete._id}`);
      if (res.data.success) {
        dispatch(fetchProjects());
        setShowDeleteModal(false);
        setProjectToDelete(null);
        toast.success('Deleted Successfully');
      }
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    try {
      // FIXED: Backend doesn't have 'private' enum, mapping it to 'group'
      const channelData = {
        ...newChannel,
        type: newChannel.type === 'private' ? 'group' : 'public'
      };
      
      const res = await apiConnector('POST', chatEndpoints.GET_CHANNELS_API, channelData);
      if (res.data.success) {
        dispatch(fetchChannels());
        setShowCreateChannel(false);
        setNewChannel({ name: '', type: 'public', projectId: '', description: '', members: [] });
        toast.success('Channel Created');
      }
    } catch (err) {
      toast.error('Failed to create channel');
    }
  };

  const toggleMemberSelection = (setForm, memberId) => {
    setForm(prev => {
      const currentMembers = prev.members || [];
      const isSelected = currentMembers.some(m => (m._id || m) === memberId);
      const updatedMembers = isSelected 
        ? currentMembers.filter(m => (m._id || m) !== memberId) 
        : [...currentMembers, memberId];
      return { ...prev, members: updatedMembers };
    });
  };

  const handleEnterProject = (projId) => {
    // Find the first channel of this project
    const projectChannels = channels.filter(c => (c.projectId?._id || c.projectId) === projId);
    if (projectChannels.length > 0) {
      dispatch(setActiveChannelId(projectChannels[0]._id));
    }
    navigate('/dashboard/chat');
  };

  const canManage = ['admin', 'manager', 'hr'].includes(user?.role?.toLowerCase());

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      {/* Sleek Minimal Header */}
      <div className="max-w-6xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Project Workspaces</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage Teams & Collaboration</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {canManage && (
              <button 
                onClick={() => setShowCreateProject(true)}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Plus className="w-4 h-4" /> New Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Simplified Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((proj) => (
            <motion.div 
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key={proj._id} 
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden"
            >
              <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${proj.type === 'public' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1.5 opacity-100 transition-all">
                      <button 
                        onClick={() => {
                          setEditingProject(proj);
                          setShowEditProject(true);
                        }}
                        className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white transition-all"
                        title="Settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setProjectToDelete(proj);
                          setShowDeleteModal(true);
                        }}
                        className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-white transition-all"
                        title="Delete Workspace"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-1">
                   <div className={`w-1.5 h-1.5 rounded-full ${proj.type === 'public' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{proj.type} Space</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-6 truncate">{proj.name}</h3>

                {/* Simplified Channels Info */}
                <div className="space-y-3 mb-6">
                   <div className="flex flex-wrap gap-2">
                      {channels.filter(c => (c.projectId?._id || c.projectId) === proj._id).slice(0, 3).map(ch => (
                        <div key={ch._id} className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 flex items-center gap-1.5">
                           <Hash className="w-3 h-3 text-indigo-400" />
                           <span className="text-[10px] font-bold text-slate-600">{(ch.name || '').substring(0, 15)}</span>
                        </div>
                      ))}
                      {channels.filter(c => (c.projectId?._id || c.projectId) === proj._id).length > 3 && (
                        <div className="px-2 py-1 bg-indigo-50 rounded-lg text-[9px] font-black text-indigo-600">
                          +{channels.filter(c => (c.projectId?._id || c.projectId) === proj._id).length - 3}
                        </div>
                      )}
                   </div>
                </div>

                {/* Footer Stats */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                   <div className="flex -space-x-2">
                      {proj.members?.slice(0, 3).map((m, i) => (
                        <div key={i} className="w-7 h-7 rounded-full bg-white border border-slate-100 flex items-center justify-center text-[9px] font-black text-indigo-600 shadow-sm" title={m.name}>
                          {m.name?.[0]}
                        </div>
                      ))}
                      {proj.members?.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-[8px] font-black text-white border border-white">
                          +{proj.members.length - 3}
                        </div>
                      )}
                   </div>
                   <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {proj.members?.length || 0}</span>
                      <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {channels.filter(c => (c.projectId?._id || c.projectId) === proj._id).length}</span>
                   </div>
                </div>
              </div>

              {/* Minimal Action Bar */}
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center gap-3">
                 <button 
                    onClick={() => {
                      setNewChannel({ ...newChannel, projectId: proj._id });
                      setShowCreateChannel(true);
                    }}
                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                 >
                   <Plus className="w-3 h-3" /> Add Channel
                 </button>
                 <button 
                    onClick={() => handleEnterProject(proj._id)}
                    className="ml-auto w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-900 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                 >
                   <ArrowRight className="w-4 h-4" />
                 </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- Refined Modals --- */}
      <AnimatePresence>
        {showCreateProject && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateProject(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">New Project</h2>
                <button onClick={() => setShowCreateProject(false)} className="w-8 h-8 flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateProject} className="p-6 space-y-5">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Workspace Name</label>
                  <div className="relative group">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                      placeholder="e.g. Creative Lab" 
                      value={newProject.name}
                      onChange={e => setNewProject({...newProject, name: e.target.value})}
                      required 
                    />
                  </div>
                </div>

                <div>
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Workspace Access (Privacy)</label>
                   <p className="text-[8px] text-slate-400 font-bold mb-3 ml-1 italic">* Determines who can see this project card on their dashboard.</p>
                   <div className="grid grid-cols-2 gap-4">
                     <button 
                       type="button"
                       onClick={() => setNewProject({...newProject, type: 'public'})}
                       className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${newProject.type === 'public' ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-50 bg-white opacity-60'}`}
                     >
                       <Globe className={`w-5 h-5 ${newProject.type === 'public' ? 'text-indigo-600' : 'text-slate-400'}`} />
                       <span className={`text-[10px] font-black uppercase tracking-widest ${newProject.type === 'public' ? 'text-indigo-600' : 'text-slate-400'}`}>Public</span>
                     </button>
                     <button 
                       type="button"
                       onClick={() => setNewProject({...newProject, type: 'private'})}
                       className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${newProject.type === 'private' ? 'border-rose-600 bg-rose-50/30' : 'border-slate-50 bg-white opacity-60'}`}
                     >
                       <Lock className={`w-5 h-5 ${newProject.type === 'private' ? 'text-rose-600' : 'text-slate-400'}`} />
                       <span className={`text-[10px] font-black uppercase tracking-widest ${newProject.type === 'private' ? 'text-rose-600' : 'text-slate-400'}`}>Private</span>
                     </button>
                   </div>
                </div>

                <div className="space-y-2">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign Members</span>
                   <div className="max-h-32 overflow-y-auto p-3 bg-slate-50 rounded-xl space-y-1 custom-scrollbar border border-slate-100">
                      {employees?.map(emp => (
                        <div 
                          key={emp._id} 
                          onClick={() => toggleMemberSelection(setNewProject, emp._id)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${newProject.members.includes(emp._id) ? 'bg-white text-indigo-600 shadow-sm border border-indigo-50' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                          <span className="text-[10px] font-bold">{emp.name}</span>
                          {newProject.members.includes(emp._id) && <ShieldCheck className="w-3 h-3" />}
                        </div>
                      ))}
                   </div>
                </div>

                <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Launch Space</button>
              </form>
            </motion.div>
          </div>
        )}

        {showCreateChannel && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateChannel(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-6">
                   <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">New Channel</h2>
                   <form onSubmit={handleCreateChannel} className="space-y-6">
                      <div className="space-y-4">
                         <div className="relative">
                            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                            <input 
                              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all"
                              placeholder="channel-name"
                              value={newChannel.name}
                              onChange={e => setNewChannel({...newChannel, name: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                              required
                            />
                         </div>
                         <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Channel Visibility (Topic Access)</label>
                            <p className="text-[8px] text-slate-400 font-bold mb-3 ml-1 italic">* Public = All project members can see. Private = Selected only.</p>
                            <div className="flex bg-slate-50 p-1 rounded-2xl">
                               <button type="button" onClick={() => setNewChannel({...newChannel, type: 'public'})} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newChannel.type === 'public' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Public</button>
                               <button type="button" onClick={() => setNewChannel({...newChannel, type: 'private'})} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newChannel.type === 'private' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Private</button>
                            </div>
                         </div>
                      </div>
                      <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Create</button>
                   </form>
                </div>
             </motion.div>
          </div>
        )}

        {showEditProject && editingProject && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditProject(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Settings</h2>
                  <button onClick={() => setShowEditProject(false)} className="w-8 h-8 flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleUpdateProject} className="p-6 space-y-5">
                   <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Workspace Name</label>
                        <input 
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                          value={editingProject.name}
                          onChange={e => setEditingProject({...editingProject, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Manage Team</span>
                         <div className="max-h-32 overflow-y-auto p-3 bg-slate-50 rounded-xl space-y-1 custom-scrollbar border border-slate-100">
                            {employees?.map(emp => {
                               const isMember = editingProject.members?.some(m => (m._id || m) === emp._id);
                               return (
                                 <div 
                                    key={emp._id} 
                                    onClick={() => toggleMemberSelection(setEditingProject, emp._id)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${isMember ? 'bg-white text-indigo-600 shadow-sm border border-indigo-50' : 'text-slate-500 hover:bg-white/50'}`}
                                 >
                                    <span className="text-[10px] font-bold">{emp.name}</span>
                                    {isMember && <ShieldCheck className="w-3 h-3" />}
                                 </div>
                               );
                            })}
                         </div>
                      </div>
                   </div>
                   <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">
                      Save Changes
                   </button>
                </form>
             </motion.div>
          </div>
        )}

        {/* --- DELETE CONFIRMATION MODAL --- */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-4">
                   <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">Are you sure?</h3>
                <p className="text-xs text-slate-500 font-medium mb-6">
                  This will permanently delete <span className="font-bold text-slate-900">"{projectToDelete?.name}"</span> and all its channels. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                   <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                    onClick={handleDeleteProject}
                    className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
                   >
                     Delete
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Projects;
