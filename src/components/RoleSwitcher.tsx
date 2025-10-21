"use client";

import { useState, useEffect } from "react";

export default function RoleSwitcher({ initialRole }: { initialRole: string }) {
  const [userId, setUserId] = useState<string>("");
  
  useEffect(() => {
    const stored = localStorage.getItem("routeiq_userId");
    if (stored) setUserId(stored);
  }, []);

  const handleUserIdChange = (val: string) => {
    setUserId(val);
    localStorage.setItem("routeiq_userId", val);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="userId" className="text-xs font-medium" style={{ color: 'var(--foreground-muted)' }}>
          User ID:
        </label>
        <input
          id="userId"
          type="text"
          value={userId}
          onChange={(e) => handleUserIdChange(e.target.value)}
          placeholder="your@email.com"
          className="px-3 py-1.5 rounded-lg text-xs border outline-none focus:ring-2 transition-all"
          style={{ 
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            color: 'var(--foreground)' 
          }}
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="role" className="text-xs font-medium" style={{ color: 'var(--foreground-muted)' }}>
          Role:
        </label>
        <select
          id="role"
          name="role"
          defaultValue={initialRole}
          onChange={(e) => {
            document.cookie = `role=${e.target.value}; path=/; max-age=31536000`;
            window.location.reload();
          }}
          className="px-3 py-1.5 rounded-lg text-xs border outline-none focus:ring-2 transition-all"
          style={{ 
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            color: 'var(--foreground)' 
          }}
        >
          <option value="user">User</option>
          <option value="marketing">Marketing</option>
          <option value="admin">Admin</option>
        </select>
      </div>
    </div>
  );
}

