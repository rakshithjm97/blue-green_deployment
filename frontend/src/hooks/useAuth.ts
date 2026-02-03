import { useState } from 'react';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const s = localStorage.getItem('current_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const setAndPersist = (u: any) => {
    if (u) localStorage.setItem('current_user', JSON.stringify(u));
    else localStorage.removeItem('current_user');
    setCurrentUser(u);
  };

  return { currentUser, setCurrentUser: setAndPersist };
};