import React from "react";

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-10 h-10 border-3 border-cyan/20 border-top-cyan rounded-full animate-spin" 
           style={{ borderTopColor: "#00D4FF", borderStyle: "solid", borderWidth: "3px" }} />
    </div>
  );
};

export default LoadingSpinner;
