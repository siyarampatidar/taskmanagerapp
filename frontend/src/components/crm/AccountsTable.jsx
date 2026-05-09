import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    Search, Building2, Globe, FileText, 
    MoreHorizontal, Filter, Plus, ArrowUpDown, Pencil, Trash2, X
} from 'lucide-react';
import { createAccount, updateAccount, deleteAccount } from '../../redux/slices/crmSlice';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../common/ConfirmModal';

export default function AccountsTable() {
    const dispatch = useDispatch();
    const { accounts, loading } = useSelector(state => state.crm);
    const { user } = useSelector(state => state.auth || { user: {} }); // Assuming user is in auth slice
    const [searchQ, setSearchQ] = useState('');
    
    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [form, setForm] = useState({ name: '', industry: '', website: '', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({ industry: '' });

    const filtered = accounts.filter(a => {
        const matchesSearch = a.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
                             a.industry?.toLowerCase().includes(searchQ.toLowerCase());
        const matchesIndustry = !filters.industry || a.industry === filters.industry;
        return matchesSearch && matchesIndustry;
    });

    const industries = [...new Set(accounts.map(a => a.industry).filter(Boolean))];

    const openAdd = () => {
        setForm({ name: '', industry: '', website: '', description: '' });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEdit = (acc) => {
        setSelectedId(acc._id);
        setForm({ name: acc.name, industry: acc.industry || '', website: acc.website || '', description: acc.description || '' });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        setIdToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if(!idToDelete) return;
        const res = await dispatch(deleteAccount(idToDelete));
        if(deleteAccount.fulfilled.match(res)) toast.success('Account deleted');
        else toast.error('Failed to delete');
        setIdToDelete(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        let res;
        if(isEditing) {
            res = await dispatch(updateAccount({ id: selectedId, data: form }));
        } else {
            res = await dispatch(createAccount({ ...form, ownerId: user?._id }));
        }
        setIsSubmitting(false);

        if(res.type.endsWith('fulfilled')) {
            toast.success(`Account ${isEditing ? 'updated' : 'created'}!`);
            setShowModal(false);
        } else {
            toast.error(res.payload || 'An error occurred');
        }
    };

    return (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Table Action Bar */}
            <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between gap-4">
                <div className="relative max-w-xs flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search accounts..." 
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
                        <Filter className="w-3.5 h-3.5" /> {filters.industry ? `Filtered: ${filters.industry}` : 'Filters'}
                    </button>
                    
                    {showFilters && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 rounded-xl shadow-xl z-30 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Industry</span>
                                <button onClick={() => setFilters({ industry: '' })} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Reset</button>
                            </div>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                <button 
                                    onClick={() => { setFilters({ industry: '' }); setShowFilters(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${!filters.industry ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    All Industries
                                </button>
                                {industries.map(ind => (
                                    <button 
                                        key={ind}
                                        onClick={() => { setFilters({ industry: ind }); setShowFilters(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors ${filters.industry === ind ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        {ind}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button onClick={openAdd} className="btn-primary px-3 py-1.5 text-[11px] font-bold flex items-center gap-2 shadow-blue-100">
                        <Plus className="w-3.5 h-3.5" /> Add Account
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span className="flex items-center gap-2">
                                    Account Name <ArrowUpDown className="w-3 h-3" />
                                </span>
                            </th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Industry</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map(account => (
                            <tr key={account._id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 text-sm font-bold shadow-sm">
                                            {account.name?.[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-bold text-slate-700 group-hover:text-violet-600 transition-colors">
                                                {account.name}
                                            </p>
                                            {account.description && (
                                                <p className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5 italic">
                                                    "{account.description}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold text-slate-500 w-fit">
                                        {account.industry || 'General Business'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {account.website ? (
                                        <a href={account.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline text-xs transition-colors">
                                            <Globe className="w-3 h-3" />
                                            {account.website.replace(/(^\w+:|^)\/\//, '')}
                                        </a>
                                    ) : '—'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-black uppercase shadow-sm">
                                            {account.ownerId?.name?.[0] || 'U'}
                                        </div>
                                        {account.ownerId?.name || 'Unassigned'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => openEdit(account)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(account._id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
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
                                        <Building2 className="w-10 h-10 mb-2 text-slate-400" />
                                        <p className="text-sm font-bold uppercase tracking-widest text-slate-400 italic">No Accounts Found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Account Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                {isEditing ? 'Edit Account' : 'New Account'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Account Name *</label>
                                <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Industry</label>
                                    <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} placeholder="e.g. Technology" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Website</label>
                                    <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Description</label>
                                <textarea rows="3" className="input-field bg-slate-50 border-slate-100 text-xs font-medium" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                            </div>
                            
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary px-6 py-2 text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                                    {isSubmitting ? 'Saving...' : 'Save Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Delete Account"
                message="Are you sure you want to delete this account? This will remove all associated data."
            />
        </div>
    );

}
