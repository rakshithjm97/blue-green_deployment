import React from 'react';

export const ViewContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-8">
    {children}
  </div>
);

export default ViewContainer;
