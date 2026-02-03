import React from 'react';

const Dashboard: React.FC<any> = ({ currentUser }) => {
  return (
    <div>
      <p className="text-[11px] font-black text-purple-600 uppercase tracking-[0.4em]">Welcome</p>
      <h1 className="text-4xl font-black mt-2">Hello, {currentUser?.name || currentUser?.email}</h1>
      <p className="mt-6 text-gray-600">Use the sidebar to navigate.</p>
    </div>
  );
};

export default Dashboard;