import React from "react";

interface GlassSkeletonProps {
  className?: string;
}

const GlassSkeleton: React.FC<GlassSkeletonProps> = ({ className }) => {
  return (
    <div 
      className={`relative overflow-hidden bg-white/5 rounded-xl ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
    </div>
  );
};

export default GlassSkeleton;
