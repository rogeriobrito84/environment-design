import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'tonal';
  isLoading?: boolean;
  themeColor?: string; // e.g. 'indigo', 'blue', 'teal'
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '', 
  disabled,
  themeColor = 'indigo',
  ...props 
}) => {
  // MD3 Base: Rounded full, font medium, flex center
  const baseStyles = "px-6 py-3 rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  // Dynamic color mapping for primary variant
  const getPrimaryStyle = () => {
    switch(themeColor) {
        case 'blue': return "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-md shadow-blue-500/20";
        case 'teal': return "bg-teal-600 hover:bg-teal-700 text-white focus:ring-teal-500 shadow-md shadow-teal-500/20";
        case 'emerald': return "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-md shadow-emerald-500/20";
        case 'orange': return "bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500 shadow-md shadow-orange-500/20";
        case 'rose': return "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-md shadow-rose-500/20";
        default: return "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500 shadow-md shadow-indigo-500/20";
    }
  };

  const variants = {
    primary: getPrimaryStyle(),
    secondary: "bg-transparent border border-current hover:bg-current/10 backdrop-blur-sm", // Text color handled by parent
    tonal: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700",
    danger: "bg-red-500/80 hover:bg-red-600 text-white focus:ring-red-500",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 opacity-80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </>
      ) : children}
    </button>
  );
};