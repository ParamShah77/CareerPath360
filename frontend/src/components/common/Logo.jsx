import React from 'react';

const Logo = ({ size = 'md', showText = true, className = '' }) => {
  const sizes = {
    sm: { box: 'w-8 h-8', text: 'text-sm', spacing: 'gap-2' },
    md: { box: 'w-10 h-10', text: 'text-base', spacing: 'gap-2.5' },
    lg: { box: 'w-12 h-12', text: 'text-lg', spacing: 'gap-3' },
    xl: { box: 'w-14 h-14', text: 'text-xl', spacing: 'gap-3' }
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center ${currentSize.spacing} ${className}`}>
      <div 
        className={`${currentSize.box} rounded-lg flex items-center justify-center shadow-md`}
        style={{background: 'linear-gradient(135deg, #13A8A8 0%, #18B3B3 100%)'}}
      >
        <span className="text-white font-bold">C360</span>
      </div>
      {showText && (
        <span className={`font-bold text-slate-900 dark:text-white ${currentSize.text}`}>
          Career<span className="bg-clip-text text-transparent bg-gradient-to-r from-[#13A8A8] to-[#18B3B3]">Path</span>360
        </span>
      )}
    </div>
  );
};

export default Logo;
