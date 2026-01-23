import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark'; 
}

const Logo: React.FC<LogoProps> = ({ className = "", showText = true, size = 'md', variant = 'light' }) => {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
    xl: 'w-48 h-48 md:w-64 md:h-64'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl md:text-5xl'
  };

  const primaryTextColor = variant === 'light' ? 'text-white' : 'text-malawi-black';

  return (
    <div className={`flex flex-col items-center justify-center gap-1 ${className}`}>
      <div className={`${sizes[size]} relative flex items-center justify-center shrink-0 overflow-hidden rounded-2xl shadow-2xl`}>
         <svg viewBox="0 0 512 512" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
               <linearGradient id="crownGold" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#B8860B', stopOpacity: 1 }} />
               </linearGradient>
            </defs>
            {/* Background */}
            <rect width="512" height="512" fill="#4a081a" />
            
            {/* Eagle Head & Feathers */}
            <path d="M256 420c-40-15-110-90-130-190-5-30 40-50 70-20l60-70 60 70c30-30 75-10 70 20-20 100-90 175-130 190z" fill="#D21034" />
            <path d="M256 180l-50 75 50 45 50-45z" fill="white" />
            <path d="M256 255l-15 30 15 15 15-15z" fill="#FFD700" />
            
            {/* Eagle Eyes */}
            <circle cx="220" cy="220" r="8" fill="#FFD700" />
            <circle cx="292" cy="220" r="8" fill="#FFD700" />
            <circle cx="220" cy="220" r="3" fill="black" />
            <circle cx="292" cy="220" r="3" fill="black" />

            {/* Crown */}
            <path d="M180 140l-30-70 60 40 46-70 46 70 60-40-30 70z" fill="url(#crownGold)" stroke="#3a2a00" strokeWidth="4" />
            <circle cx="256" cy="110" r="12" fill="#0000FF" />
            <circle cx="210" cy="125" r="8" fill="#0000FF" />
            <circle cx="302" cy="125" r="8" fill="#0000FF" />

            {/* KPH Text */}
            <text x="256" y="380" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="80" fill="#FFD700" textAnchor="middle">KPH</text>
            
            {/* Tagline */}
            <text x="256" y="440" fontFamily="'Inter', sans-serif" fontWeight="700" fontSize="22" fill="white" textAnchor="middle" letterSpacing="8">TRANSFORMING LIVES</text>
         </svg>
      </div>
      
      {showText && size !== 'xl' && (
        <div className="flex flex-col items-center">
          <span className={`font-black tracking-tighter ${textSizes[size]} leading-none flex items-center`}>
            <span className={primaryTextColor}>KENNETH</span>
            <span className="text-malawi-red">POETRYHEALTH</span>
          </span>
          <span className="text-[8px] font-bold tracking-[0.4em] text-gray-500 uppercase mt-1">Transforming Lives</span>
        </div>
      )}
    </div>
  );
};

export default Logo;