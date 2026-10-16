// src/components/UserMenu.tsx
import { useState } from 'react';
import { signOut } from '../lib/auth-client';

interface Props {
  className?: string;
}

export default function UserMenu({ className }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    if (await signOut()) {
      window.location.reload();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 text-white hover:bg-slate-800 transition-colors"
        aria-label="User menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 py-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50">
          <a
            href="/profile"
            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Profile
          </a>
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
