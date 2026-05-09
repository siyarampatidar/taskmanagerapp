import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    Search, Mail, Phone, Building2, User, 
    MoreVertical, ArrowUpDown, Filter, Plus,
    MoreHorizontal, Pencil, Trash2, X, CheckSquare
} from 'lucide-react';
import { createContact, updateContact, deleteContact } from '../../redux/slices/crmSlice';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../common/ConfirmModal';
import EmailSlideOver from './EmailSlideOver';

export default function ContactsTable() {
    const dispatch = useDispatch();
    const { contacts, accounts, loading } = useSelector(state => state.crm);
    const { user } = useSelector(state => state.auth || { user: {} });
    const [searchQ, setSearchQ] = useState('');

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', accountId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);

    // Bulk Selection & Email States
    const [selectedIds, setSelectedIds] = useState([]);
    const [showEmailSlider, setShowEmailSlider] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({ accountId: '' });

    const filtered = contacts.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
                             c.email?.toLowerCase().includes(searchQ.toLowerCase()) ||
                             c.phone?.includes(searchQ);
        const matchesAccount = !filters.accountId || c.accountId?._id === filters.accountId;
        return matchesSearch && matchesAccount;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedIds(filtered.map(c => c._id));
        else setSelectedIds([]);
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const openAdd = () => {
        setForm({ name: '', email: '', phone: '', accountId: '' });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEdit = (contact) => {
        setSelectedId(contact._id);
        setForm({ 
            name: contact.name, 
            email: contact.email || '', 
            phone: contact.phone || '', 
            accountId: contact.accountId?._id || '' 
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        setIdToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if(!idToDelete) return;
        const res = await dispatch(deleteContact(idToDelete));
        if(deleteContact.fulfilled.match(res)) toast.success('Contact deleted');
        else toast.error('Failed to delete');
        setIdToDelete(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        let payload = { ...form };
        if(!payload.accountId) delete payload.accountId;

        let res;
        if(isEditing) {
            res = await dispatch(updateContact({ id: selectedId, data: payload }));
        } else {
            res = await dispatch(createContact({ ...payload, ownerId: user?._id }));
        }
        setIsSubmitting(false);

        if(res.type.endsWith('fulfilled')) {
            toast.success(`Contact ${isEditing ? 'updated' : 'created'}!`);
            setShowModal(false);
        } else {
            toast.error(res.payload || 'An error occurred');
        }
    };

    return (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
            
            {/* Table Action Bar */}
            <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between gap-4 relative min-h-[60px]">
                
                {selectedIds.length > 0 ? (
                    // Bulk Action Bar
                    <div className="absolute inset-0 bg-blue-50/80 backdrop-blur-sm z-10 flex items-center justify-between px-4 border-b border-blue-100 animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg">
                                {selectedIds.length} Selected
                            </span>
                            <button onClick={() => setSelectedIds([])} className="text-[11px] font-bold text-blue-500 hover:text-blue-700">
                                Clear Selection
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowEmailSlider(true)}
                                className="btn-primary px-4 py-1.5 text-[11px] font-bold flex items-center gap-2 shadow-blue-100"
                            >
                                <Mail className="w-3.5 h-3.5" /> Send Email
                            </button>
                        </div>
                    </div>
                ) : (
                    // Default Toolbar
                    <>
                        <div className="relative max-w-xs flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search contacts..." 
                                className="input-field pl-9 py-1.5 text-xs"
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 relative">
                            <button 
                                onClick={() => setShowFilters(!showFilters)} 
                                className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-2 rounded-lg border transition-all ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Filter className="w-3.5 h-3.5" /> {filters.accountId ? 'Filtered' : 'Filters'}
                            </button>

                            {showFilters && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-100 rounded-xl shadow-xl z-30 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Account</span>
                                        <button onClick={() => setFilters({ accountId: '' })} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Reset</button>
                                    </div>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                        <button 
                                            onClick={() => { setFilters({ accountId: '' }); setShowFilters(false); }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${!filters.accountId ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            All Accounts
                                        </button>
                                        {accounts.map(acc => (
                                            <button 
                                                key={acc._id}
                                                onClick={() => { setFilters({ accountId: acc._id }); setShowFilters(false); }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${filters.accountId === acc._id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                {acc.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button onClick={openAdd} className="btn-primary px-3 py-1.5 text-[11px] font-bold flex items-center gap-2 shadow-blue-100">
                                <Plus className="w-3.5 h-3.5" /> Add Contact
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-4 py-4 w-10">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span className="flex items-center gap-2 cursor-pointer hover:text-slate-600">
                                    Name <ArrowUpDown className="w-3 h-3" />
                                </span>
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map(contact => (
                            <tr key={contact._id} className={`hover:bg-blue-50/30 transition-colors group ${selectedIds.includes(contact._id) ? 'bg-blue-50/10' : ''}`}>
                                <td className="px-4 py-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        checked={selectedIds.includes(contact._id)}
                                        onChange={() => handleSelectRow(contact._id)}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shadow-sm">
                                            {contact.name?.[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                                                {contact.name}
                                            </p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <User className="w-2.5 h-2.5 text-slate-300" />
                                                <span className="text-[10px] text-slate-400 font-medium">{contact.ownerId?.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-slate-500 hover:text-blue-600 cursor-pointer text-xs transition-colors">
                                        <Mail className="w-3 h-3" />
                                        {contact.email || '—'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                                        <Phone className="w-3 h-3" />
                                        {contact.phone}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg w-fit text-[11px] font-bold text-slate-600 border border-slate-100">
                                        <Building2 className="w-3 h-3 text-slate-300" />
                                        {contact.accountId?.name || 'Manual Entry'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => openEdit(contact)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(contact._id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center opacity-30">
                                        <User className="w-10 h-10 mb-2 text-slate-400" />
                                        <p className="text-sm font-bold uppercase tracking-widest text-slate-400 italic">No Contacts Found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Contact Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600" />
                                {isEditing ? 'Edit Contact' : 'New Contact'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name *</label>
                                <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                                    <input type="email" className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                                    <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Related Account</label>
                                <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})}>
                                    <option value="">-- No Account --</option>
                                    {accounts?.map(acc => (
                                        <option key={acc._id} value={acc._id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary px-6 py-2 text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                                    {isSubmitting ? 'Saving...' : 'Save Contact'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Email Slide-Over */}
            <EmailSlideOver 
                isOpen={showEmailSlider}
                onClose={() => setShowEmailSlider(false)}
                selectedItems={contacts.filter(c => selectedIds.includes(c._id))}
                onSuccess={() => setSelectedIds([])}
            />

            <ConfirmModal 
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Contact"
                message="Are you sure you want to delete this contact? This will remove all associated communication history."
            />
        </div>
    );
}
