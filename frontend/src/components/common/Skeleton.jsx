import React from 'react';

const Skeleton = ({ className, variant = 'rect' }) => {
  const baseClasses = "bg-slate-200 animate-pulse";
  const variantClasses = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-3 w-full",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
};

export const DashboardSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <Skeleton className="w-48 h-8" />
                <Skeleton className="w-64 h-4" />
            </div>
            <Skeleton className="w-12 h-12" variant="circle" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 space-y-4 shadow-xs">
                    <Skeleton className="w-10 h-10" variant="circle" />
                    <div className="space-y-2">
                        <Skeleton className="w-24 h-6" />
                        <Skeleton className="w-16 h-4" />
                    </div>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl border border-slate-100 h-[400px] shadow-xs">
                <Skeleton className="w-32 h-6 mb-8" />
                <Skeleton className="w-full h-[280px]" />
            </div>
            <div className="bg-white p-8 rounded-xl border border-slate-100 h-[400px] shadow-xs">
                <Skeleton className="w-32 h-6 mb-8" />
                <Skeleton className="w-full h-[280px]" />
            </div>
        </div>
    </div>
);

export const CRMSkeleton = () => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <Skeleton className="w-32 h-8" />
                <Skeleton className="w-56 h-4" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="w-28 h-10" />
                <Skeleton className="w-32 h-10" />
            </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-64 flex-shrink-0 space-y-4">
                    <Skeleton className="w-24 h-4" />
                    {[1, 2, 3].map(j => (
                        <div key={j} className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
                            <Skeleton className="w-full h-4" />
                            <Skeleton className="w-2/3 h-3" />
                            <div className="flex justify-between">
                                <Skeleton className="w-12 h-3" />
                                <Skeleton className="w-12 h-3" />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export const TasksSkeleton = () => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <Skeleton className="w-40 h-8" />
                <Skeleton className="w-64 h-4" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="w-32 h-10" />
                <Skeleton className="w-28 h-10" />
            </div>
        </div>
        <div className="flex gap-6 overflow-hidden">
            {['todo', 'inprogress', 'inreview', 'completed'].map(status => (
                <div key={status} className="w-72 flex-shrink-0 space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <Skeleton className="w-20 h-4" />
                        <Skeleton className="w-6 h-6" variant="circle" />
                    </div>
                    {[1, 2, 3].map(j => (
                        <div key={j} className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
                            <div className="flex gap-2">
                                <Skeleton className="w-12 h-3" />
                                <Skeleton className="w-16 h-3" />
                            </div>
                            <Skeleton className="w-full h-4" />
                            <div className="flex gap-3">
                                <Skeleton className="w-24 h-3" />
                                <Skeleton className="w-24 h-3" />
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="w-5 h-5" variant="circle" />
                                    <Skeleton className="w-20 h-3" />
                                </div>
                                <Skeleton className="w-8 h-3" />
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export default Skeleton;
