import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  key?: React.Key;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse bg-slate-200 rounded-md", className)} {...props} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <Skeleton className="w-16 h-4 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-24 h-3" />
        <Skeleton className="w-32 h-8" />
      </div>
    </div>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      <div className="h-44 bg-slate-200 animate-pulse relative">
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="w-32 h-6 bg-slate-300" />
            <Skeleton className="w-24 h-3 bg-slate-300" />
          </div>
          <Skeleton className="w-10 h-10 rounded-full bg-slate-300" />
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="w-24 h-3" />
          <Skeleton className="w-12 h-3" />
        </div>
        <Skeleton className="w-full h-10 rounded-xl mt-2" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
      <div className="flex items-center justify-between">
        <Skeleton className="w-48 h-4" />
        <Skeleton className="w-20 h-6" />
      </div>
      <Skeleton className="w-full h-[300px] rounded-2xl" />
    </div>
  );
}
