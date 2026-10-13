import { useState, useEffect } from 'react';

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Expose open method globally for Header to call
    (window as any).openAuthModal = () => setIsOpen(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div className='auth-modal-overlay'>
      <div className='auth-modal'>
        <h2>Join the conversation</h2>
        <p>The Freedom Wall is for Baleno National High School alumni. Sign in to start pinning your notes.</p>
        <div className='auth-modal-actions'>
          <a href='/api/auth/google' className='button button-primary' style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <svg viewBox="0 0 48 48" width="20" height="20" style={{ display: 'block' }}>
              <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.9 31.7 30.6 34 24 34c-5.5 0-10.2-3.8-11.8-9H5.7v8.5C7.9 40.5 15.3 45 24 45c11.1 0 20.5-7.7 20.5-20.5 0-1.5-.1-3-.4-4.5z"/>
              <path fill="#34A853" d="M12.2 25c-0.9-2.7-0.9-5.7 0-8.5V8H5.7C2.1 11.5 0 17 0 24c0 7 2.1 12.5 5.7 16l6.5-5.5z"/>
              <path fill="#FBBC05" d="M24 11c6.5 0 11.5 2.5 14.5 5.5l10.8-10.8C42.8 1.5 33.7 0 24 0 15.3 0 7.9 4.5 5.7 11.5l6.5 5.5C13.8 13.5 18.5 11 24 11z"/>
              <path fill="#EA4335" d="M24 45c9.7 0 18.8-1.5 25.5-4.5L38.5 30c-3 2-7 3-14.5 3-5.5 0-10.2-2.3-11.8-6.5L5.7 32C7.9 39 15.3 45 24 45z"/>
            </svg>
            Sign in with Google
          </a>
          <button onClick={() => setIsOpen(false)} className='button'>Cancel</button>
        </div>
      </div>
    </div>
  );
}
