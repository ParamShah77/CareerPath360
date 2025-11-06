import React from 'react';
import { X, Sparkles, Award, CheckCircle, ArrowRight } from 'lucide-react';

const OptimizationModal = ({ isOpen, onClose, optimizationData }) => {
  if (!isOpen || !optimizationData) return null;

  const { original, optimized, improvements } = optimizationData;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <div>
              <h2 className="text-2xl font-bold">AI Optimization Complete</h2>
              <p className="text-purple-100 text-sm">Review the improvements made to your resume</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          
          {improvements && improvements.length > 0 && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border-2 border-green-300 dark:border-green-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                What We Improved
              </h3>
              <ul className="space-y-2">
                {improvements.map((improvement, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <ArrowRight className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {original?.personalInfo?.summary !== optimized?.personalInfo?.summary && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Professional Summary</h3>
                <span className="ml-auto px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                  IMPROVED
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Before</p>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                    {original?.personalInfo?.summary || 'Not provided'}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase mb-2">After (AI Enhanced)</p>
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-sm text-gray-900 dark:text-gray-100 border-2 border-green-300 dark:border-green-700 font-medium">
                    {optimized?.personalInfo?.summary}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> Your resume has been automatically updated with these improvements.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
          >
            Got it! Continue Editing
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptimizationModal;
