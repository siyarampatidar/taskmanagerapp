import { useState, useEffect, useRef } from 'react';
import 'emoji-picker-element';
import { useLocation } from 'react-router-dom';
import { 
  Hash, 
  Send, 
  User, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Info,
  Circle,
  Users,
  Check,
  CheckCheck,
  ChevronLeft,
  Pin,
  PinOff,
  Reply,
  Image,
  Smile,
  Lock,
  Briefcase,
  FileUp, 
  X, 
  Paperclip, 
  FileText, 
  Video as VideoIcon, 
  Download, 
  Mic, 
  PlusSquare,
  Plus,
  UserPlus,
  MessageSquare,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMessages, addMessage, clearMessages, createDirectChannel, fetchChannels, removeMessage, incrementUnread, markAsRead, markMessagesRead, setActiveChannelId, updateMessageReaction, togglePinChannel, setReplyingTo, createChannel, inviteToChannel } from '../redux/slices/chatSlice';
import { fetchProjects, createProject } from '../redux/slices/projectSlice';
import { fetchEmployees, fetchDepartments, fetchPendingLeaves, processLeave } from '../redux/slices/hrSlice';
import { useWebRTC } from '../hooks/useWebRTC';
import AudioPlayer from '../components/chat/AudioPlayer';
import VoiceRecorder from '../components/chat/VoiceRecorder';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { apiConnector } from '../Services/apiConnector';
import { chatEndpoints } from '../Services/apis';

const Chat = () => {
  const dispatch = useDispatch();
  const { channels, messages, loading, unreadCounts, activeChannelId } = useSelector((state) => state.chat);
  const { projects } = useSelector((state) => state.projects);
  const { employees, departments, pendingLeaves } = useSelector((state) => state.hr);
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const { user } = useAuth();
  const { initiateCall } = useWebRTC();

  const activeChannel = channels.find(c => c._id === activeChannelId);
  const [input, setInput] = useState('');
  const [chatFiles, setChatFiles] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastInput, setBroadcastInput] = useState('');
  const [messageToForward, setMessageToForward] = useState(null);
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Dual Mode
  const [chatMode, setChatMode] = useState('workspace'); // 'workspace' or 'personal'
  
  // New States for Advanced Features
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const { onlineUsers } = useSelector(state => state.socket);
  const { typingUsers, pagination, pinnedChannelIds, replyingTo } = useSelector(state => state.chat);
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  // New feature states
  const [memberSearch, setMemberSearch] = useState('');
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  
  const [activeTab, setActiveTab] = useState('members');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', type: 'public', members: [] });
  const [newChannel, setNewChannel] = useState({ name: '', type: 'public', projectId: '', members: [] });
  const [selectedInvitees, setSelectedInvitees] = useState([]);

  const emojiPickerRef = useRef(null);
  const emojiPickerContainerRef = useRef(null);
  const endRef = useRef(null);
  const chatContainerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    dispatch(fetchChannels());
    dispatch(fetchProjects());
    dispatch(fetchEmployees());
    dispatch(fetchDepartments());
    dispatch(fetchPendingLeaves());
  }, [dispatch]);



  useEffect(() => {
    if (!activeChannelId) return;
    dispatch(fetchMessages({ channelId: activeChannelId, page: 1 }));
    dispatch(markAsRead(activeChannelId));
    dispatch({ type: 'socket/emit', payload: { event: 'joinRoom', data: activeChannelId } });
    dispatch({ type: 'socket/emit', payload: { event: 'markAsRead', data: { channelId: activeChannelId } } });
    if (activeChannelId) setShowMobileChat(true);
  }, [activeChannelId, dispatch]);

  const handleScroll = (e) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && pagination.hasMore && !loading) {
      dispatch(fetchMessages({ channelId: activeChannelId, page: pagination.page + 1 }));
    }
  };

  const handleTyping = () => {
    if (!activeChannelId) return;
    dispatch({ type: 'socket/emit', payload: { event: 'typing', data: { channelId: activeChannelId, userName: user?.name } } });
    if (typingTimeout) clearTimeout(typingTimeout);
    const timeout = setTimeout(() => {
        dispatch({ type: 'socket/emit', payload: { event: 'stopTyping', data: { channelId: activeChannelId } } });
    }, 2000);
    setTypingTimeout(timeout);
  };

  useEffect(() => {
    const handleEmojiClick = (e) => {
      const emoji = e.detail.unicode;
      setInput(prev => prev + emoji);
      setShowEmojiPicker(false);
    };
    const picker = emojiPickerRef.current;
    if (picker) {
      picker.addEventListener('emoji-click', handleEmojiClick);
    }
    return () => {
      if (picker) picker.removeEventListener('emoji-click', handleEmojiClick);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiConnector('POST', chatEndpoints.UPLOAD_ATTACHMENT_API, formData, {
      'Content-Type': 'multipart/form-data'
    });
    if (!res.data.success) throw new Error(res.data.message);
    return res.data.file;
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!input.trim() && chatFiles.length === 0) || !activeChannel) return;
    setUploading(true);
    try {
      let attachments = [];
      for (const file of chatFiles) {
        const uploaded = await uploadFile(file);
        attachments.push(uploaded);
      }
      dispatch({ 
        type: 'socket/emit', 
        payload: { 
          event: 'sendMessage', 
          data: { 
            channelId: activeChannelId, 
            text: input.trim(),
            attachments,
            replyTo: replyingTo ? { _id: replyingTo._id, text: replyingTo.text, senderName: replyingTo.senderName } : null
          } 
        }
      });
      setInput('');
      setChatFiles([]);
      dispatch(setReplyingTo(null));
      if (typingTimeout) {
          clearTimeout(typingTimeout);
          dispatch({ type: 'socket/emit', payload: { event: 'stopTyping', data: { channelId: activeChannelId } } });
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const handleVoiceSend = async (blob) => {
    setUploading(true);
    try {
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const uploaded = await uploadFile(file);
      dispatch({ 
        type: 'socket/emit', 
        payload: { event: 'sendMessage', data: { channelId: activeChannelId, text: '', attachments: [uploaded] } }
      });
      setIsRecording(false);
    } catch (err) { toast.error('Voice upload failed'); }
    finally { setUploading(false); }
  };

  const openDM = async (emp) => {
    try {
      const result = await dispatch(createDirectChannel(emp._id)).unwrap();
      dispatch(setActiveChannelId(result.channel._id));
      setChatMode('personal');
    } catch (err) { console.error(err); }
  };

  const getChannelName = (channel) => {
    if (channel.type === 'direct') {
      const otherUser = channel.members.find(m => m._id !== user?.id && m._id !== user?._id);
      return otherUser ? otherUser.name : channel.name;
    }
    return channel.name;
  };

  const handleDeleteMessage = () => {
    if (!messageToDelete || !activeChannelId) return;
    dispatch({ type: 'socket/emit', payload: { event: 'deleteMessage', data: { messageId: messageToDelete, channelId: activeChannelId } } });
    setShowDeleteConfirm(false);
    setMessageToDelete(null);
  };

  const handleForward = () => {
    if ((selectedChannels.length === 0 && selectedUsers.length === 0) || !messageToForward) return;
    dispatch({
      type: 'socket/emit',
      payload: {
        event: 'forwardMessage',
        data: { message: messageToForward, targetChannelIds: selectedChannels, targetUserIds: selectedUsers }
      }
    });
    setShowForwardModal(false);
    setSelectedChannels([]);
    setSelectedUsers([]);
    setMessageToForward(null);
  };

  const handleBroadcast = async () => {
    if ((selectedChannels.length === 0 && selectedUsers.length === 0) || !broadcastInput.trim()) return;
    setUploading(true);
    try {
      await apiConnector('POST', chatEndpoints.BROADCAST_MESSAGE_API, {
        targetChannelIds: selectedChannels,
        targetUserIds: selectedUsers,
        text: broadcastInput.trim()
      });
      toast.success('Broadcast sent successfully');
      setShowBroadcastModal(false);
      setSelectedChannels([]);
      setSelectedUsers([]);
      setBroadcastInput('');
    } catch (err) { toast.error('Broadcast failed'); }
    finally { setUploading(false); }
  };

  const toggleChannel = (id) => {
    setSelectedChannels(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };
  const toggleUser = (id) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleReact = async (messageId, emoji) => {
    try {
      const res = await apiConnector('POST', chatEndpoints.REACT_MESSAGE_API(messageId), { emoji });
      if (res.data.success) {
        dispatch(updateMessageReaction({ messageId, reactions: res.data.reactions }));
      }
    } catch (err) { toast.error('Could not react'); }
    setOpenMenuId(null);
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    try {
      await dispatch(createChannel({
        ...newChannel,
        type: newChannel.type === 'private' ? 'group' : 'public'
      })).unwrap();
      setShowCreateChannelModal(false);
      setNewChannel({ name: '', type: 'public', projectId: '', members: [] });
      toast.success('Channel Created!');
    } catch (err) {
      toast.error(err || 'Channel create karne mein error aaya');
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(inviteToChannel({ channelId: activeChannelId, userIds: selectedInvitees })).unwrap();
      toast.success('Members invited!');
      setShowInviteModal(false);
      setSelectedInvitees([]);
    } catch (err) {
      toast.error(err || 'Invite karne mein error aaya');
    }
  };

  const handleLeaveAction = async (id, status) => {
    try {
      const result = await dispatch(processLeave({ id, data: { status } })).unwrap();
      if (result) {
        toast.success(`Leave ${status} successfully`);
        dispatch(fetchPendingLeaves()); // Refresh the list
      }
    } catch (err) {
      toast.error(err || 'Action failed');
    }
  };

  const mediaGalleryItems = messages.flatMap(m =>
    (m.attachments || []).filter(a => a.fileType?.includes('image')).map(a => ({ url: a.url, name: a.name, time: m.createdAt }))
  );

  const filteredMessages = messages.filter(m => {
      if (!searchQuery) return true;
      const contentMatch = m.text?.toLowerCase().includes(searchQuery.toLowerCase());
      const attachmentMatch = m.attachments?.some(a => a.name?.toLowerCase().includes(searchQuery.toLowerCase()));
      return contentMatch || attachmentMatch;
  });

  const filteredEmployees = employees.filter(e => e._id !== user?.id && e._id !== user?._id && (!memberSearch || e.name.toLowerCase().includes(memberSearch.toLowerCase())));
  
  const employeesByDept = departments.reduce((acc, dept) => {
    const deptEmployees = filteredEmployees.filter(emp => 
      (emp.departmentId?._id || emp.departmentId) === dept._id
    );
    if (deptEmployees.length > 0) {
      acc.push({ ...dept, employees: deptEmployees });
    }
    return acc;
  }, []);

  // Add a "No Department" group for employees without a department
  const noDeptEmployees = filteredEmployees.filter(emp => !emp.departmentId);
  if (noDeptEmployees.length > 0) {
    employeesByDept.push({ _id: 'no-dept', name: 'Other Members', employees: noDeptEmployees });
  }

  const toggleDept = (deptId) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [deptId]: !prev[deptId]
    }));
  };

  const canManage = ['admin', 'manager', 'hr'].includes(user?.role?.toLowerCase());

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-100px)] bg-white overflow-hidden md:border border-slate-100 md:rounded-2xl shadow-sm relative">
      {/* 1. SIDEBAR (DUAL MODE) */}
      <div className={`w-full md:w-64 border-r border-gray-100 flex flex-col bg-gray-50/30 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 flex flex-col gap-3 bg-white">
          <div className="flex items-center gap-2">
              <button 
                onClick={() => setChatMode('workspace')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${chatMode === 'workspace' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                <Briefcase className="w-3 h-3" /> Work
              </button>
              <button 
                onClick={() => setChatMode('personal')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${chatMode === 'personal' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                <MessageSquare className="w-3 h-3" /> Chat
              </button>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Connections</h2>
            <div className="flex items-center gap-3">
              <PlusSquare className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-pointer" onClick={() => setShowBroadcastModal(true)} />
              {activeChannel && mediaGalleryItems.length > 0 && <Image className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-600 cursor-pointer" onClick={() => setShowMediaGallery(true)} />}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
            <Search className="w-3 h-3 text-gray-400" />
            <input className="bg-transparent text-[11px] flex-1 outline-none text-gray-700 placeholder-gray-400" placeholder="Search..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-gray-200">
          {chatMode === 'workspace' ? (
             <div>
                <div className="px-4 py-2 flex items-center justify-between group">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Workspaces</span>
                  {canManage && <Plus className="w-3 h-3 text-gray-300 hover:text-indigo-600 cursor-pointer" onClick={() => setShowCreateProjectModal(true)} />}
                </div>
                {projects.map(proj => (
                   <div key={proj._id} className="mb-2">
                      <div className="px-4 py-1 flex items-center justify-between group bg-slate-100/30">
                         <span className="text-[10px] font-black text-slate-600 uppercase truncate">{proj.name}</span>
                         {canManage && <Plus className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100" onClick={() => { setNewChannel({...newChannel, projectId: proj._id}); setShowCreateChannelModal(true); }} />}
                      </div>
                      {channels.filter(c => (c.projectId?._id || c.projectId) === proj._id).map(ch => (
                         <button
                           key={ch._id}
                           onClick={() => dispatch(setActiveChannelId(ch._id))}
                           className={`w-full px-6 py-1.5 flex items-center gap-2 transition-all ${activeChannelId === ch._id ? 'bg-indigo-50 border-r-2 border-indigo-600 text-indigo-700 font-bold' : 'hover:bg-white text-gray-600'}`}
                         >
                           {ch.type === 'private' || ch.type === 'group' ? <Lock className="w-3 h-3 text-rose-500" /> : <Hash className="w-3.5 h-3.5 text-indigo-500" />}
                           <span className="text-[11px] truncate">{ch.name}</span>
                           {unreadCounts[ch._id] > 0 && <span className="ml-auto bg-rose-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full">{unreadCounts[ch._id]}</span>}
                         </button>
                      ))}
                   </div>
                ))}
             </div>
          ) : (
             <div>
                <div className="px-4 py-2 flex items-center justify-between group">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Departments</span>
                </div>
                {employeesByDept.map(dept => (
                  <div key={dept._id} className="mb-1">
                    <button
                      onClick={() => toggleDept(dept._id)}
                      className="w-full px-4 py-2 flex items-center justify-between hover:bg-slate-100 transition-colors group/dept"
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">{dept.name}</span>
                        <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">{dept.employees.length}</span>
                      </div>
                      <ChevronLeft className={`w-3 h-3 text-slate-400 transition-transform ${expandedDepartments[dept._id] ? '-rotate-90' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {expandedDepartments[dept._id] && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-slate-50/50"
                        >
                          {dept.employees.map(emp => {
                            const dmChan = channels.find(c => c.type === 'direct' && c.members.some(m => (m._id || m) === emp._id));
                            const unread = dmChan ? unreadCounts[dmChan._id] : 0;
                            const isOnline = onlineUsers.includes(emp._id);
                            return (
                              <button
                                key={emp._id}
                                onClick={() => openDM(emp)}
                                className={`w-full px-8 py-2.5 flex items-center gap-3 transition-all relative ${activeChannelId === dmChan?._id ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-white text-gray-600 border-l-2 border-transparent hover:border-indigo-400'}`}
                              >
                                <div className="relative">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold overflow-hidden ${activeChannelId === dmChan?._id ? 'bg-white/20 text-white' : 'bg-white border border-slate-100 shadow-sm text-gray-500'}`}>
                                    {emp.image ? (
                                      <img src={emp.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      emp.name[0]
                                    )}
                                  </div>
                                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${activeChannelId === dmChan?._id ? 'border-indigo-600' : 'border-white'} ${isOnline ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
                                </div>
                                <div className="text-left flex-1 truncate">
                                  <p className="text-[11px] truncate leading-tight">{emp.name}</p>
                                  <p className={`text-[8px] font-black uppercase tracking-tight ${activeChannelId === dmChan?._id ? 'text-indigo-100' : 'text-slate-400'}`}>{emp.role}</p>
                                </div>
                                {unread > 0 && <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">{unread}</span>}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
             </div>
          )}
        </div>
      </div>

      {/* 2. CHAT AREA */}
      <div className={`flex-1 flex flex-col bg-white ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChannel ? (
          <>
            <div className="px-3 md:px-6 h-14 border-b border-gray-100 flex items-center justify-between bg-white z-10 sticky top-0">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <button onClick={() => setShowMobileChat(false)} className="md:hidden p-2 -ml-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  {activeChannel.type === 'direct' ? <User className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900">{getChannelName(activeChannel)}</h3>
                  {typingUsers[activeChannelId]?.length > 0 ? (
                    <p className="text-[9px] text-indigo-500 font-bold animate-pulse">{typingUsers[activeChannelId].map(u => u.userName).join(', ')} typing...</p>
                  ) : (
                    <p className="text-[9px] text-gray-400 font-medium uppercase tracking-tight">{activeChannel.type} CHANNEL</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-400">
                <Search className="w-3.5 h-3.5 cursor-pointer hover:text-indigo-600" onClick={() => setShowSearchBar(!showSearchBar)} />
                <Phone className="w-3.5 h-3.5 cursor-pointer hover:text-indigo-600" onClick={() => {
                  if (activeChannel.type === 'direct') {
                    const otherUser = activeChannel.members.find(m => m._id !== user?.id && m._id !== user?._id);
                    if (otherUser) initiateCall(otherUser._id, otherUser.name, 'voice');
                  } else {
                    initiateCall(activeChannel._id, activeChannel.name, 'voice', true);
                  }
                }} />
                <Video className="w-3.5 h-3.5 cursor-pointer hover:text-indigo-600" onClick={() => {
                  if (activeChannel.type === 'direct') {
                    const otherUser = activeChannel.members.find(m => m._id !== user?.id && m._id !== user?._id);
                    if (otherUser) initiateCall(otherUser._id, otherUser.name, 'video');
                  } else {
                    initiateCall(activeChannel._id, activeChannel.name, 'video', true);
                  }
                }} />
                {chatMode === 'workspace' && <Info className="w-3.5 h-3.5 cursor-pointer hover:text-indigo-600" onClick={() => setShowRightPanel(!showRightPanel)} />}
              </div>
            </div>

            {showSearchBar && (
                <div className="px-6 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <Search className="w-3 h-3 text-gray-400" />
                    <input className="bg-transparent border-none outline-none text-[11px] flex-1" placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <X className="w-3 h-3 text-gray-400 cursor-pointer" onClick={() => setShowSearchBar(false)} />
                </div>
            )}

            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-100 bg-slate-50/20">
              {pagination.hasMore && (
                  <div className="flex justify-center pb-4"><button onClick={() => dispatch(fetchMessages({ channelId: activeChannelId, page: pagination.page + 1 }))} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 shadow-sm">Load Previous Messages</button></div>
              )}
              {filteredMessages.map((msg, i) => {
                const isMe = (msg.senderId?._id || msg.senderId) === (user?.id || user?._id);
                return (
                  <div key={msg._id || i} className={`flex group ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-500 mt-1 overflow-hidden">
                          {msg.senderId?.image ? (
                            <img src={msg.senderId.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            msg.senderId?.name?.[0] || 'S'
                          )}
                        </div>
                      )}
                      <div>
                        {!isMe && <span className="text-[10px] font-bold text-gray-500 mb-1 block px-1">{msg.senderId?.name}</span>}
                        <div className={`px-3 py-2 rounded-2xl text-[12px] leading-relaxed shadow-xs relative group/bubble ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-50 text-gray-700 border border-gray-100 rounded-tl-none'}`}>
                          {msg.replyTo?._id && <div className={`text-[9px] mb-1 px-2 py-1 rounded border-l-2 border-indigo-400 ${isMe ? 'bg-indigo-500/30 text-white/70' : 'bg-gray-100 text-gray-500'}`}><span className="font-bold">{msg.replyTo.senderName}</span>: {msg.replyTo.text}</div>}
                          {msg.text}
                          {msg.attachments?.map((file, idx) => (
                             <div key={idx} className="mt-2">
                                {file.fileType.includes('image') ? <img src={file.url} alt={file.name} className="max-w-full rounded-lg" /> : file.fileType.includes('audio') ? <AudioPlayer src={file.url} isMe={isMe} /> : <a href={file.url} target="_blank" className="flex items-center gap-2 p-1.5 bg-black/10 rounded-lg text-[10px]"><FileText className="w-3 h-3" /> {file.name}</a>}
                             </div>
                          ))}

                          {/* Hover Menu tucked close */}
                          <div className={`absolute top-0 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover/bubble:opacity-100 transition-all`}>
                             <button onClick={() => setOpenMenuId(openMenuId === msg._id ? null : msg._id)} className="p-1 text-gray-400 hover:text-indigo-600"><MoreVertical className="w-3.5 h-3.5" /></button>
                             {openMenuId === msg._id && (
                                <div className={`absolute ${isMe ? 'right-full mr-1' : 'left-full ml-1'} top-0 w-32 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in zoom-in-95`}>
                                   <div className="flex gap-1 px-2 pb-1.5 border-b border-gray-50">{QUICK_REACTIONS.map(e => <button key={e} onClick={() => handleReact(msg._id, e)} className="hover:scale-125 transition-all text-sm">{e}</button>)}</div>
                                   <button onClick={() => { dispatch(setReplyingTo({_id: msg._id, text: msg.text, senderName: msg.senderId.name})); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[10px] text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 font-bold"><Reply className="w-3 h-3" /> Reply</button>
                                   <button onClick={() => { setMessageToForward(msg); setShowForwardModal(true); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[10px] text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 font-bold"><PlusSquare className="w-3 h-3" /> Forward</button>
                                   {isMe && <button onClick={() => { setMessageToDelete(msg._id); setShowDeleteConfirm(true); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-[10px] text-red-500 hover:bg-red-50 flex items-center gap-1.5 font-bold"><X className="w-3 h-3" /> Delete</button>}
                                </div>
                             )}
                          </div>
                        </div>

                        {/* Reactions below bubble */}
                        {msg.reactions?.length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {msg.reactions.map(r => (
                              <button key={r.emoji} onClick={() => handleReact(msg._id, r.emoji)} className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-all ${r.users.includes((user?.id || user?._id)?.toString()) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-100 text-gray-600 hover:border-indigo-200'}`}>{r.emoji} <span className="text-[9px] font-bold">{r.users.length}</span></button>
                            ))}
                          </div>
                        )}
                        <div className={`text-[9px] text-gray-400 mt-1 flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMe && (msg.readBy?.length > 1 ? <CheckCheck className="w-2.5 h-2.5 text-blue-500" /> : <Check className="w-2.5 h-2.5 text-gray-300" />)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/30">
               {replyingTo && <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100"><Reply className="w-3 h-3 text-indigo-500" /><div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-indigo-600">{replyingTo.senderName}</p><p className="text-[10px] text-gray-500 truncate">{replyingTo.text}</p></div><X className="w-3 h-3 text-gray-400 cursor-pointer" onClick={() => dispatch(setReplyingTo(null))} /></div>}
               <form onSubmit={sendMessage} className="relative flex items-center gap-2">
                  <div className="flex-1 bg-white border border-gray-200 rounded-xl flex items-center px-4 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20">
                     <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-400 hover:text-indigo-600"><Smile className="w-4 h-4" /></button>
                     <label className="cursor-pointer text-gray-400 hover:text-indigo-600 p-2"><Paperclip className="w-4 h-4" /><input type="file" className="hidden" multiple onChange={e => setChatFiles([...chatFiles, ...Array.from(e.target.files)])} /></label>
                     <textarea className="flex-1 bg-transparent p-3 text-sm font-medium outline-none resize-none h-12" placeholder={uploading ? "Uploading..." : "Type a message..."} value={input} onChange={e => { setInput(e.target.value); handleTyping(); }} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())} disabled={uploading} />
                     <button type="button" onClick={() => setIsRecording(!isRecording)} className={`${isRecording ? 'text-rose-500 animate-pulse' : 'text-gray-400'} hover:text-indigo-600 p-2`}><Mic className="w-4 h-4" /></button>
                  </div>
                  <button type="submit" disabled={!input.trim() && chatFiles.length === 0} className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 transition-all active:scale-95"><Send className="w-5 h-5" /></button>
                  {showEmojiPicker && (
                    <div ref={emojiPickerContainerRef} className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
                      <emoji-picker 
                        ref={emojiPickerRef} 
                        className="light"
                        style={{
                          '--num-columns': '6',
                          '--category-emoji-size': '1.2rem',
                          '--emoji-size': '1.2rem',
                          'width': '280px',
                          'height': '320px'
                        }}
                      ></emoji-picker>
                    </div>
                  )}
                  {isRecording && <div className="absolute inset-0 bg-white flex items-center justify-center rounded-xl z-50"><VoiceRecorder onSend={handleVoiceSend} onCancel={() => setIsRecording(false)} /></div>}
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-gray-50/20">
             <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 text-indigo-600"><Briefcase className="w-8 h-8" /></div>
             <h2 className="text-lg font-bold text-gray-900">Collaboration Hub</h2>
             <p className="text-xs text-gray-400 mt-2 max-w-xs">Switch between Workspace and Chat modes to start collaborating.</p>
          </div>
        )}
      </div>

      {/* 3. RIGHT PANEL (WORKSPACE ONLY) */}
      <AnimatePresence>
          {showRightPanel && chatMode === 'workspace' && activeChannel && (
            <motion.div 
              initial={{ x: 300, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }} 
              exit={{ x: 300, opacity: 0 }} 
              className="fixed md:relative inset-0 md:inset-auto z-50 md:z-0 w-full md:w-80 border-l border-slate-100 bg-white flex flex-col"
            >
               <div className="flex items-center justify-between p-4 border-b border-slate-50 md:hidden">
                  <h3 className="font-bold text-sm">Channel Info</h3>
                  <button onClick={() => setShowRightPanel(false)} className="p-2 bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
               </div>
               <div className="p-4 border-b border-slate-50"><div className="flex bg-slate-50 p-1 rounded-xl"><button onClick={() => setActiveTab('members')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'members' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Members</button><button onClick={() => setActiveTab('leaves')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'leaves' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Leaves</button></div></div>
               <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                  {activeTab === 'members' ? (
                     <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active In Channel</span>
                           {canManage && (
                             <button 
                               onClick={() => {
                                 setSelectedInvitees(activeChannel.members.map(m => m._id || m));
                                 setShowInviteModal(true);
                               }} 
                               className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black border border-indigo-100"
                             >
                               <UserPlus className="w-3 h-3" /> Manage
                             </button>
                           )}
                        </div>
                        {activeChannel?.members?.map(emp => (
                           <div key={emp._id} className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase border border-gray-100 overflow-hidden">
                               {emp.image ? (
                                 <img src={emp.image} alt="" className="w-full h-full object-cover" />
                               ) : (
                                 emp.name?.[0]
                               )}
                             </div>
                             <div className="flex-1 min-w-0">
                               <p className="text-xs font-bold text-gray-800 truncate">{emp.name}</p>
                               <p className="text-[9px] text-gray-400 font-medium uppercase truncate">{emp.role}</p>
                             </div>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Leave Requests</span><Calendar className="w-4 h-4 text-rose-500" /></div>
                        {pendingLeaves.length === 0 ? <div className="text-center py-10"><CheckCircle2 className="w-8 h-8 text-emerald-100 mx-auto mb-2" /><p className="text-[10px] font-bold text-gray-400 uppercase">All clear!</p></div> : pendingLeaves.map(leave => (
                           <div key={leave._id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-bold text-indigo-600 overflow-hidden">
                                 {leave.userId?.image ? (
                                   <img src={leave.userId.image} alt="" className="w-full h-full object-cover" />
                                 ) : (
                                   leave.userId?.name?.[0]
                                 )}
                               </div>
                               <div className="flex-1">
                                 <p className="text-xs font-bold text-slate-900">{leave.userId?.name}</p>
                                 <p className="text-[9px] text-slate-400 uppercase">{leave.leaveType} LEAVE</p>
                               </div>
                             </div>
                             <div className="bg-white/50 rounded-xl p-2.5 space-y-1">
                               <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500">
                                 <Calendar className="w-3 h-3" /> {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                               </div>
                               <p className="text-[10px] text-slate-600 italic">"{leave.reason}"</p>
                             </div>
                             {canManage && (
                               <div className="flex gap-2">
                                 <button onClick={() => handleLeaveAction(leave._id, 'approve')} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase">Approve</button>
                                 <button onClick={() => handleLeaveAction(leave._id, 'reject')} className="flex-1 py-2 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase">Reject</button>
                               </div>
                             )}
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* --- ALL MODALS --- */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <div onClick={() => setShowBroadcastModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
             <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-black uppercase tracking-widest">New Broadcast</h3><X onClick={() => setShowBroadcastModal(false)} className="cursor-pointer text-slate-400" /></div>
                <textarea className="w-full p-4 bg-slate-50 rounded-xl text-xs font-bold mb-4 outline-none resize-none h-24" placeholder="Type broadcast message..." value={broadcastInput} onChange={e => setBroadcastInput(e.target.value)} />
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin pr-2">
                   <div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Public Channels</span>
                     {channels.filter(c => c.type !== 'direct').map(ch => (
                        <div key={ch._id} onClick={() => toggleChannel(ch._id)} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${selectedChannels.includes(ch._id) ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50'}`}>
                           <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedChannels.includes(ch._id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                             {selectedChannels.includes(ch._id) && <Check className="w-3 h-3 text-white" />}
                           </div>
                           <Hash className="w-3.5 h-3.5 text-indigo-500" />
                           <span className="text-xs font-bold text-slate-600">{ch.name}</span>
                        </div>
                     ))}
                   </div>

                   <div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Departments & Members</span>
                     {employeesByDept.map(dept => (
                       <div key={dept._id} className="mb-3">
                         <div className="flex items-center justify-between px-2 mb-1">
                           <span className="text-[9px] font-black text-slate-500 uppercase">{dept.name}</span>
                           <button 
                             onClick={() => {
                               const deptEmpIds = dept.employees.map(e => e._id);
                               const allSelected = deptEmpIds.every(id => selectedUsers.includes(id));
                               if (allSelected) {
                                 setSelectedUsers(prev => prev.filter(id => !deptEmpIds.includes(id)));
                               } else {
                                 setSelectedUsers(prev => [...new Set([...prev, ...deptEmpIds])]);
                               }
                             }}
                             className="text-[8px] font-black text-indigo-600 hover:underline"
                           >
                             {dept.employees.every(e => selectedUsers.includes(e._id)) ? 'Deselect All' : 'Select All'}
                           </button>
                         </div>
                         <div className="space-y-1">
                           {dept.employees.map(emp => (
                              <div key={emp._id} onClick={() => toggleUser(emp._id)} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${selectedUsers.includes(emp._id) ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50'}`}>
                                 <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedUsers.includes(emp._id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                   {selectedUsers.includes(emp._id) && <Check className="w-3 h-3 text-white" />}
                                 </div>
                                 <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black overflow-hidden">
                                   {emp.image ? <img src={emp.image} className="w-full h-full object-cover" /> : emp.name[0]}
                                 </div>
                                 <span className="text-xs font-bold text-slate-600">{emp.name}</span>
                              </div>
                           ))}
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
                <button onClick={handleBroadcast} disabled={uploading || (selectedChannels.length === 0 && selectedUsers.length === 0) || !broadcastInput.trim()} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Send Broadcast</button>
             </div>
          </div>
        )}
        {showForwardModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <div onClick={() => setShowForwardModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
             <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-black uppercase tracking-widest">Forward Message</h3><X onClick={() => setShowForwardModal(false)} className="cursor-pointer text-slate-400" /></div>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-thin pr-2">
                   <div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Public Channels</span>
                     {channels.filter(c => c.type !== 'direct').map(ch => (
                        <div key={ch._id} onClick={() => toggleChannel(ch._id)} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${selectedChannels.includes(ch._id) ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50'}`}>
                           <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedChannels.includes(ch._id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                             {selectedChannels.includes(ch._id) && <Check className="w-3 h-3 text-white" />}
                           </div>
                           <Hash className="w-3.5 h-3.5 text-indigo-500" />
                           <span className="text-xs font-bold text-slate-600">{ch.name}</span>
                        </div>
                     ))}
                   </div>

                   <div>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Departments & Members</span>
                     {employeesByDept.map(dept => (
                       <div key={dept._id} className="mb-3">
                         <div className="flex items-center justify-between px-2 mb-1">
                           <span className="text-[9px] font-black text-slate-500 uppercase">{dept.name}</span>
                         </div>
                         <div className="space-y-1">
                           {dept.employees.map(emp => (
                               <div key={emp._id} onClick={() => toggleUser(emp._id)} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${selectedUsers.includes(emp._id) ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50'}`}>
                                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedUsers.includes(emp._id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                    {selectedUsers.includes(emp._id) && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black overflow-hidden">
                                    {emp.image ? <img src={emp.image} className="w-full h-full object-cover" /> : emp.name[0]}
                                  </div>
                                  <span className="text-xs font-bold text-slate-600">{emp.name}</span>
                               </div>
                           ))}
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
                <button onClick={handleForward} disabled={selectedChannels.length === 0 && selectedUsers.length === 0} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Forward Message</button>
             </div>
          </div>
        )}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
             <div onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
             <div className="relative bg-white rounded-2xl p-6 w-full max-w-xs animate-in zoom-in-95"><h3 className="text-sm font-bold text-slate-900 mb-2">Delete Message?</h3><p className="text-[11px] text-slate-500 mb-6 font-medium">Are you sure you want to delete this message? This cannot be undone.</p><div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 text-[10px] font-black uppercase bg-slate-100 text-slate-500 rounded-lg">Cancel</button><button onClick={handleDeleteMessage} className="flex-1 py-2 text-[10px] font-black uppercase bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-100">Delete</button></div></div>
          </div>
        )}
        {showMediaGallery && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" onClick={() => setShowMediaGallery(false)}>
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
             <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Media Gallery</h3><X onClick={() => setShowMediaGallery(false)} className="cursor-pointer text-slate-400" /></div>
                <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2 p-2 scrollbar-thin">
                   {mediaGalleryItems.map((item, idx) => (<a key={idx} href={item.url} target="_blank" className="aspect-square rounded-xl overflow-hidden border border-slate-100"><img src={item.url} className="w-full h-full object-cover" /></a>))}
                </div>
             </div>
          </div>
        )}
        {showCreateProjectModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div onClick={() => setShowCreateProjectModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"><h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">New Workspace</h2><form onSubmit={(e) => { e.preventDefault(); dispatch(createProject(newProject)); setShowCreateProjectModal(false); }} className="space-y-4"><input className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none" placeholder="Workspace Name..." value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} required /><button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Create Workspace</button></form></div>
          </div>
        )}
        {showCreateChannelModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div onClick={() => setShowCreateChannelModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"><h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">New Channel</h2><form onSubmit={handleAddChannel} className="space-y-4"><input className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold border-2 border-transparent focus:border-indigo-500 outline-none" placeholder="channel-name" value={newChannel.name} onChange={e => setNewChannel({...newChannel, name: e.target.value.toLowerCase().replace(/\s+/g, '-')})} required /><div className="flex bg-slate-50 p-1 rounded-xl"><button type="button" onClick={() => setNewChannel({...newChannel, type: 'public'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${newChannel.type === 'public' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Public</button><button type="button" onClick={() => setNewChannel({...newChannel, type: 'private'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${newChannel.type === 'private' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Private</button></div><button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Create Channel</button></form></div>
          </div>
        )}
        {showInviteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <div onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
             <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col max-h-[80vh] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Manage Members</h2>
                   <div className="px-2 py-1 bg-indigo-50 rounded-lg text-[10px] font-bold text-indigo-600">{selectedInvitees.length} Selected</div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mb-6 scrollbar-thin pr-1">
                   {employees.map(emp => {
                     const isSelected = selectedInvitees.includes(emp._id);
                     return (
                       <label 
                         key={emp._id} 
                         className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-50 bg-white hover:border-slate-100'}`}
                       >
                         <input 
                           type="checkbox" 
                           className="hidden" 
                           checked={isSelected} 
                           onChange={() => setSelectedInvitees(prev => prev.includes(emp._id) ? prev.filter(i => i !== emp._id) : [...prev, emp._id])} 
                         />
                         <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase overflow-hidden">
                           {emp.image ? <img src={emp.image} className="w-full h-full object-cover" /> : emp.name[0]}
                         </div>
                         <div className="flex-1">
                            <span className="text-xs font-bold text-slate-700">{emp.name}</span>
                            <p className="text-[9px] text-slate-400 uppercase font-medium">{emp.role}</p>
                         </div>
                         {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                       </label>
                     );
                   })}
                </div>
                <div className="flex gap-3">
                   <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                   <button onClick={handleInviteSubmit} className="flex-2 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100">Update Members</button>
                </div>
             </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Chat;
