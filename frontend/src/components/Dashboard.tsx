import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Activity } from 'lucide-react';
import { apiService } from '../services/api';

export const Dashboard: React.FC = () => {
  const [totalRequirements, setTotalRequirements] = useState('0');
  const [totalTestCases, setTotalTestCases] = useState('0');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch requirements and test cases in parallel
        const [reqs, tcs] = await Promise.all([
          apiService.getRequirements(),
          apiService.getTestCases()
        ]);

        // Update state with counts
        setTotalRequirements(Array.isArray(reqs) ? reqs.length.toLocaleString() : '0');
        setTotalTestCases(Array.isArray(tcs) ? tcs.length.toLocaleString() : '0');
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      label: 'Requirements',
      value: totalRequirements,
      change: '+12%',
      trend: 'up',
      icon: Activity,
      color: 'green'
    },
    {
      label: 'Generated Test Cases',
      value: totalTestCases,
      change: '+8.2%',
      trend: 'up',
      icon: Zap,
      color: 'teal'
    }
    // Compliance Score card removed
  ];

  return (
    <div className="space-y-6 px-2 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-slate-900">Dashboard Overview</h2>
      </div>

      {/* Stats Grid - responsive columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
              <div className={`flex items-center space-x-1 text-sm ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`h-4 w-4 ${stat.trend === 'down' ? 'rotate-180' : ''}`} />
                <span>{stat.change}</span>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              <p className="text-slate-600 text-sm mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity removed per request */}

      {/* ...existing code for Risk Assessment (commented out)... */}
    </div>
  );
};