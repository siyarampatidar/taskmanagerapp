import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { updateLeadChecklist } from '../../redux/slices/crmSlice';
import { toast } from 'react-hot-toast';

export default function LeadChecklist({ lead }) {
    const dispatch = useDispatch();
    const checklist = lead.checklist || [];

    const handleToggle = async (index) => {
        const newChecklist = checklist.map((item, i) => 
            i === index ? { ...item, completed: !item.completed, updatedAt: new Date() } : item
        );
        
        const result = await dispatch(updateLeadChecklist({ leadId: lead._id, checklist: newChecklist }));
        if (updateLeadChecklist.fulfilled.match(result)) {
            toast.success('Checklist updated');
        } else {
            toast.error('Failed to update checklist');
        }
    };

    const completedCount = checklist.filter(item => item.completed).length;
    const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

    return (
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Sales Lead Checklist
                </h3>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {completedCount}/{checklist.length} Done
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full mb-5 overflow-hidden">
                <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="space-y-3">
                {checklist.map((item, index) => (
                    <div 
                        key={index} 
                        onClick={() => handleToggle(index)}
                        className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            item.completed ? 'bg-green-50/50' : 'hover:bg-slate-50'
                        }`}
                    >
                        {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                            <Circle className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {item.task}
                            </p>
                            {item.updatedAt && item.completed && (
                                <p className="text-[9px] text-slate-300 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {new Date(item.updatedAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
