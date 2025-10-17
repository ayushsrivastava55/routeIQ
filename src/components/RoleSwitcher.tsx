"use client";

export default function RoleSwitcher({ initialRole }: { initialRole: string }) {
  return (
    <form action="/" method="GET" className="flex items-center gap-2 text-xs">
      <span className="opacity-70">Role</span>
      <select
        name="role"
        defaultValue={initialRole}
        onChange={(e) => {
          document.cookie = `role=${e.target.value}; path=/; max-age=31536000`;
          window.location.reload();
        }}
        className="bg-transparent border rounded px-2 py-1"
      >
        <option value="user">User</option>
        <option value="marketing">Marketing</option>
        <option value="admin">Admin</option>
      </select>
    </form>
  );
}

