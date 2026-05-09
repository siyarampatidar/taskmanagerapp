import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    FileText, Download, Trash2, Search, PlusCircle, 
    File, FileSpreadsheet, Image as ImageIcon, ExternalLink, Clock
} from 'lucide-react';
import { fetchDocuments, deleteDocument, createDocument, fetchLeads, fetchContacts, fetchAccounts, fetchDeals } from '../../redux/slices/crmSlice';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../common/ConfirmModal';

const DOC_TYPES = ['Agreement', 'Proposal', 'Quotation', 'Invoice', 'PO', 'NDA', 'Other'];
const MODULE_TYPES = ['Lead', 'Contact', 'Account', 'Deal', 'General'];

const DocumentsTable = () => {
    const dispatch = useDispatch();
    const { documents, leads, contacts, accounts, deals, loading } = useSelector(s => s.crm);
    
    const [searchQ, setSearchQ] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [form, setForm] = useState({
        name: '',
        type: 'Other',
        relatedTo: 'Lead',
        relatedId: '',
        notes: ''
    });
    const [file, setFile] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);

    useEffect(() => {
        // No redundant dispatches here. CRM.jsx handles the initial module-level fetch.
    }, []);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            if (selected.size > 5 * 1024 * 1024) return toast.error("File size must be less than 5MB");
            setFile(selected);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.error("Please select a file to upload");
        if (form.relatedTo !== 'General' && !form.relatedId) return toast.error("Please select a related record");

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', form.name);
        formData.append('type', form.type);
        formData.append('relatedTo', form.relatedTo);
        formData.append('relatedId', form.relatedId);
        formData.append('notes', form.notes);

        const result = await dispatch(createDocument(formData));
        setIsSubmitting(false);

        if (createDocument.fulfilled.match(result)) {
            toast.success("Document uploaded successfully!");
            setShowUploadModal(false);
            setForm({ name: '', type: 'Other', relatedTo: 'Lead', relatedId: '', notes: '' });
            setFile(null);
        } else {
            toast.error(result.payload || "Failed to upload document");
        }
    };

    const handleDelete = (id) => {
        setIdToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!idToDelete) return;
        const result = await dispatch(deleteDocument(idToDelete));
        if (deleteDocument.fulfilled.match(result)) toast.success("Document deleted");
        else toast.error("Failed to delete");
        setIdToDelete(null);
    };

    const filtered = (documents || []).filter(d => 
        d.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
        d.type?.toLowerCase().includes(searchQ.toLowerCase())
    );

    const getRelatedList = () => {
        if (form.relatedTo === 'Lead') return leads;
        if (form.relatedTo === 'Contact') return contacts;
        if (form.relatedTo === 'Account') return accounts;
        if (form.relatedTo === 'Deal') return deals;
        return [];
    };

    const getFileIcon = (type) => {
        if (['jpg', 'png', 'jpeg'].includes(type?.toLowerCase())) return <ImageIcon className="w-4 h-4 text-pink-500" />;
        if (['xlsx', 'xls', 'csv'].includes(type?.toLowerCase())) return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
        return <FileText className="w-4 h-4 text-blue-500" />;
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 bg-white border border-slate-100 p-1.5 rounded-xl shadow-sm">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search documents..." 
                            className="pl-9 pr-4 py-1.5 text-xs bg-slate-50 border-none rounded-lg w-48 focus:ring-1 focus:ring-blue-100"
                            value={searchQ}
                            onChange={e => setSearchQ(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setShowUploadModal(true)} className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-2">
                        <PlusCircle className="w-4 h-4" /> Upload Document
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-12">#</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Document</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Type</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Related To</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Size</th>
                                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((doc, idx) => (
                                <tr key={doc._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-5 py-4 text-[11px] font-bold text-slate-400 text-center">{idx + 1}</td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                                                {getFileIcon(doc.fileType)}
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{doc.name}</p>
                                                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                                            {doc.type}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-700">{doc.relatedId?.name || 'N/A'}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{doc.relatedTo}</p>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center text-[11px] font-medium text-slate-500">
                                        {(doc.fileSize / 1024).toFixed(1)} KB
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    const url = doc.fileUrl;
                                                    const fileUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_BACKEND_URL}/${url}`;
                                                    const downloadUrl = fileUrl.includes('cloudinary.com') 
                                                        ? fileUrl.replace('/upload/', '/upload/fl_attachment/')
                                                        : fileUrl;
                                                    window.open(downloadUrl, '_blank');
                                                }}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(doc._id)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <FileText className="w-10 h-10 text-slate-100" />
                                            <p className="text-xs text-slate-400 font-medium">No documents found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-blue-100 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-300">
                        <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-blue-50/30">
                            <div>
                                <h2 className="text-sm font-black text-blue-900 uppercase tracking-widest">Upload Document</h2>
                                <p className="text-[10px] text-blue-400 font-bold uppercase mt-1">Attachments & Files</p>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer transition-colors">×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Document Name *</label>
                                <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Agreement_v1.pdf" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Doc Type *</label>
                                    <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                                        {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">File *</label>
                                    <input type="file" className="text-[10px] text-slate-500 w-full" onChange={handleFileChange} required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Related Module *</label>
                                    <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.relatedTo} onChange={e => setForm({...form, relatedTo: e.target.value, relatedId: ''})}>
                                        {MODULE_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                {form.relatedTo !== 'General' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Record *</label>
                                        <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.relatedId} onChange={e => setForm({...form, relatedId: e.target.value})} required>
                                            <option value="">-- Select {form.relatedTo} --</option>
                                            {getRelatedList()?.map(rec => <option key={rec._id} value={rec._id}>{rec.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Notes</label>
                                <textarea className="input-field bg-slate-50 border-slate-100 text-xs font-bold min-h-[60px]" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any specific details..." />
                            </div>

                            <div className="pt-2">
                                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-100">
                                    {isSubmitting ? 'Uploading...' : 'Save Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showDeleteModal && (
                <ConfirmModal 
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={confirmDelete}
                    title="Delete Document"
                    message="Are you sure you want to delete this document? This action cannot be undone."
                />
            )}
        </div>
    );
};

export default DocumentsTable;
