import React from 'react';
import { FiBarChart2 } from 'react-icons/fi';

export const ReportsPage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-600">Coming soon: Team performance, leaderboard, and detailed analytics</p>
      </div>

      <div className="card text-center py-12">
        <FiBarChart2 size={48} className="mx-auto text-slate-400 mb-4" />
        <p className="text-slate-600">Reports module coming in next release</p>
      </div>
    </div>
  );
};

export default ReportsPage;
