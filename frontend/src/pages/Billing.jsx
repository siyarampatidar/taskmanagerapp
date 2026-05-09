import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { 
    Plus, Search, Filter, Download, CreditCard, 
    Clock, CheckCircle, AlertCircle, FileText, 
    MoreVertical, Trash2, Eye, PlusCircle, MinusCircle, 
    TrendingUp, DollarSign, Wallet
} from 'lucide-react';
import { fetchInvoices, createInvoice, fetchBillingStats, addPayment } from '../redux/slices/billingSlice';
import { fetchAccounts } from '../redux/slices/crmSlice';
import { fetchCompanyDetails } from '../redux/slices/attendanceSlice';
import { generateInvoicePDF } from '../utils/invoiceGenerator';
import { toast } from 'react-hot-toast';

const Billing = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const { invoices, stats, loading } = useSelector(state => state.billing);
    const { accounts } = useSelector(state => state.crm);
    const { companyDetails } = useSelector(state => state.attendance);
    
    const [searchQ, setSearchQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Create Invoice Form State
    const [invoiceForm, setInvoiceForm] = useState({
        clientId: '',
        dealId: '',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        items: [{ description: '', quantity: 1, rate: 0, amount: 0 }]
    });

    // Payment Form State
    const [paymentForm, setPaymentForm] = useState({
        amount: 0,
        method: 'Bank Transfer',
        transactionId: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        dispatch(fetchInvoices());
        dispatch(fetchBillingStats());
        dispatch(fetchAccounts());
        dispatch(fetchCompanyDetails());

        // Handle pre-filled data from navigation state (e.g. from Deals page)
        if (location.state?.prefill) {
            const { clientId, dealId, amount, name, items } = location.state.prefill;
            setInvoiceForm(prev => ({
                ...prev,
                clientId: clientId || '',
                dealId: dealId || '',
                items: items || [{ description: `Invoice for ${name}`, quantity: 1, rate: amount || 0, amount: amount || 0 }]
            }));
            if (location.state?.openModal) {
                setIsCreateModalOpen(true);
            }
        }
    }, [dispatch, location.state]);

    useEffect(() => {
        if (selectedInvoice && isPaymentModalOpen) {
            setPaymentForm(prev => ({
                ...prev,
                amount: selectedInvoice.grandTotal - (selectedInvoice.paidAmount || 0)
            }));
        }
    }, [selectedInvoice, isPaymentModalOpen]);

    const handleAddItem = () => {
        setInvoiceForm({
            ...invoiceForm,
            items: [...invoiceForm.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
        });
    };

    const handleRemoveItem = (index) => {
        const newItems = invoiceForm.items.filter((_, i) => i !== index);
        setInvoiceForm({ ...invoiceForm, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...invoiceForm.items];
        newItems[index][field] = value;
        if (field === 'quantity' || field === 'rate') {
            const q = parseFloat(newItems[index].quantity) || 0;
            const r = parseFloat(newItems[index].rate) || 0;
            newItems[index].amount = q * r;
        }
        setInvoiceForm({ ...invoiceForm, items: newItems });
    };

    const calculateTotals = () => {
        const subTotal = invoiceForm.items.reduce((sum, item) => sum + item.amount, 0);
        return { subTotal, grandTotal: subTotal }; // Simple version for now
    };

    const handleCreateInvoice = async (e) => {
        e.preventDefault();
        const { subTotal, grandTotal } = calculateTotals();
        
        const result = await dispatch(createInvoice({
            ...invoiceForm,
            subTotal,
            grandTotal,
            taxTotal: 0
        }));

        if (createInvoice.fulfilled.match(result)) {
            toast.success('Invoice created successfully');
            setIsCreateModalOpen(false);
            setInvoiceForm({ clientId: '', dueDate: '', notes: '', items: [{ description: '', quantity: 1, rate: 0, amount: 0 }] });
            dispatch(fetchInvoices());
            dispatch(fetchBillingStats());
        } else {
            toast.error(result.payload || 'Failed to create invoice');
        }
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        const result = await dispatch(addPayment({
            invoiceId: selectedInvoice._id,
            ...paymentForm
        }));

        if (addPayment.fulfilled.match(result)) {
            toast.success('Payment recorded');
            setIsPaymentModalOpen(false);
            dispatch(fetchInvoices());
            dispatch(fetchBillingStats());
        } else {
            toast.error(result.payload || 'Payment failed');
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQ.toLowerCase()) || 
                              inv.clientId?.name?.toLowerCase().includes(searchQ.toLowerCase());
        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        const styles = {
            paid: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            unpaid: 'bg-amber-50 text-amber-600 border-amber-100',
            draft: 'bg-slate-50 text-slate-500 border-slate-100',
            overdue: 'bg-rose-50 text-rose-600 border-rose-100',
            'partially-paid': 'bg-blue-50 text-blue-600 border-blue-100'
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles.draft}`}>
                {status.replace('-', ' ')}
            </span>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Billing & Invoices</h1>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[2px] mt-1">Manage client payments and financial tracking</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Create Invoice
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Revenue', value: `₹${stats?.totalRevenue || 0}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Outstanding', value: `₹${stats?.outstanding || 0}`, icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Sent Invoices', value: stats?.pendingCount || 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Paid Invoices', value: stats?.paidCount || 0, icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-5 group hover:border-blue-200 transition-all">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-xl font-black text-slate-800">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search invoice number or client..." 
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-[12px] font-bold text-slate-600 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 transition-all"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <select 
                            className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-slate-500 focus:ring-0 cursor-pointer"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Invoice</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Client</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Due Date</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Total Amount</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Paid</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Balance</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[2px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv._id} className="group hover:bg-slate-50/50 transition-all">
                                    <td className="px-6 py-5">
                                        <div>
                                            <p className="text-[13px] font-black text-slate-800">{inv.invoiceNumber}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(inv.date).toLocaleDateString()}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-[10px] font-black">
                                                {inv.clientId?.name?.[0]}
                                            </div>
                                            <p className="text-[12px] font-bold text-slate-700">{inv.clientId?.name || 'N/A'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-slate-300" />
                                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-tight">
                                                {new Date(inv.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[13px] font-black text-slate-900 font-mono">₹{inv.grandTotal.toLocaleString()}</p>
                                            <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-emerald-500 transition-all duration-500" 
                                                    style={{ width: `${Math.min(100, ((inv.paidAmount || 0) / inv.grandTotal) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-[11px] font-black text-emerald-600 font-mono">₹{(inv.paidAmount || 0).toLocaleString()}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className={`text-[11px] font-black font-mono ${inv.grandTotal - (inv.paidAmount || 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                            ₹{(inv.grandTotal - (inv.paidAmount || 0)).toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-6 py-5">
                                        {getStatusBadge(inv.status)}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button 
                                                onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }}
                                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-all"
                                                title="Add Payment"
                                            >
                                                <CreditCard className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => generateInvoicePDF(inv, companyDetails)}
                                                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all"
                                                title="Download PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 hover:bg-slate-100 text-slate-400 rounded-xl transition-all" title="View Details">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center text-slate-200">
                                                <FileText className="w-8 h-8" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No invoices found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Invoice Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">New Invoice</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Fill in the details for the client</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <MinusCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateInvoice} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto hide-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Select Client *</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-[12px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all"
                                        value={invoiceForm.clientId}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, clientId: e.target.value})}
                                        required
                                    >
                                        <option value="">-- Choose Account --</option>
                                        {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Link to Deal (Optional)</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-[12px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all"
                                        value={invoiceForm.dealId}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, dealId: e.target.value})}
                                    >
                                        <option value="">-- No Deal --</option>
                                        {/* Filter deals by selected client if needed, but for now show all */}
                                        {/* Since deals are not in this page, I should probably fetch them or just let it be pre-filled */}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Due Date *</label>
                                    <input 
                                        type="date"
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-[12px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all"
                                        value={invoiceForm.dueDate}
                                        onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Items</h3>
                                    <button 
                                        type="button" 
                                        onClick={handleAddItem}
                                        className="text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-blue-700"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" /> Add Row
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {invoiceForm.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-4 items-end bg-slate-50 p-4 rounded-2xl relative group/row">
                                            <div className="flex-1">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Description</label>
                                                <input 
                                                    className="w-full bg-white border-none rounded-lg text-[11px] font-bold p-2 focus:ring-1 focus:ring-blue-200"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                                    placeholder="Service name..."
                                                    required
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Qty</label>
                                                <input 
                                                    type="number"
                                                    className="w-full bg-white border-none rounded-lg text-[11px] font-bold p-2 focus:ring-1 focus:ring-blue-200"
                                                    value={item.quantity === 0 ? '' : item.quantity}
                                                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Rate</label>
                                                <input 
                                                    type="number"
                                                    className="w-full bg-white border-none rounded-lg text-[11px] font-bold p-2 focus:ring-1 focus:ring-blue-200"
                                                    value={item.rate === 0 ? '' : item.rate}
                                                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="w-24 text-right pr-2">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5">Total</label>
                                                <p className="text-[11px] font-black text-slate-700 py-2">₹{item.amount}</p>
                                            </div>
                                            {invoiceForm.items.length > 1 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="absolute -right-2 -top-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover/row:opacity-100 transition-all shadow-lg"
                                                >
                                                    <MinusCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex flex-col items-end gap-2">
                                <div className="flex justify-between w-48 text-[11px] font-bold text-slate-500">
                                    <span>Subtotal</span>
                                    <span>₹{calculateTotals().subTotal}</span>
                                </div>
                                <div className="flex justify-between w-48 text-base font-black text-slate-800">
                                    <span>Total Amount</span>
                                    <span>₹{calculateTotals().grandTotal}</span>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[3px] hover:bg-black transition-all shadow-xl active:scale-95">
                                    Generate & Save Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-blue-50/30">
                            <div>
                                <h2 className="text-sm font-black text-blue-900 uppercase tracking-widest">Record Payment</h2>
                                <p className="text-[10px] text-blue-400 font-bold uppercase mt-1">{selectedInvoice?.invoiceNumber}</p>
                            </div>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">×</button>
                        </div>
                        <form onSubmit={handleAddPayment} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Payment Amount *</label>
                                <div className="relative">
                                    <DollarSign className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="number"
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-[12px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all"
                                        value={paymentForm.amount || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPaymentForm({...paymentForm, amount: val === '' ? '' : parseFloat(val)});
                                        }}
                                        max={selectedInvoice?.grandTotal}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Method</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-[12px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-100"
                                        value={paymentForm.method}
                                        onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                                    >
                                        {['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Credit Card'].map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Date</label>
                                    <input 
                                        type="date"
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-[12px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-100"
                                        value={paymentForm.date}
                                        onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Transaction ID / Ref</label>
                                <input 
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-[12px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-100"
                                    value={paymentForm.transactionId}
                                    onChange={(e) => setPaymentForm({...paymentForm, transactionId: e.target.value})}
                                    placeholder="e.g. UPI-12345678"
                                />
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;
