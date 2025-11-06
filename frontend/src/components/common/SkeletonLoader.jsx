import React from 'react';

export const CardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        </div>
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
      </div>
    </div>
  );
};

export const StatCardSkeleton = () => {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/20 dark:to-slate-800/10 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-800 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded w-2/3 mb-3"></div>
          <div className="h-10 bg-slate-300 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded w-1/3"></div>
        </div>
        <div className="w-14 h-14 bg-slate-300 dark:bg-slate-700 rounded-xl"></div>
      </div>
    </div>
  );
};

export const ListItemSkeleton = () => {
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>
        <div className="w-16 h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    </div>
  );
};

export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700 animate-pulse">
        <div className="flex gap-4">
          <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/4"></div>
        </div>
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, idx) => (
        <div 
          key={idx} 
          className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 animate-pulse"
        >
          <div className="flex gap-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const PageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[...Array(4)].map((_, idx) => (
            <StatCardSkeleton key={idx} />
          ))}
        </div>

        {/* Content Card Skeleton */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          <div className="space-y-4">
            {[...Array(3)].map((_, idx) => (
              <ListItemSkeleton key={idx} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default {
  CardSkeleton,
  StatCardSkeleton,
  ListItemSkeleton,
  TableSkeleton,
  PageSkeleton
};
