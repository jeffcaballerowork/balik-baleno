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
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" style={{ display: 'block' }}>
              <path fill="#EA4335" d="M24 9.5c3.3 0 6.3 1.2 8.7 3.2l6.5-6.5C34.5 2.6 29.8 0 24 0 14.7 0 6.7 5.7 3.2 13.7l7.4 5.8C12.5 12.8 17.8 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.2-3.1-.5-4.5H24v8.5h12.5c-0.5 2.7-2 5-4.2 6.5l7.4 5.8c4.3-4 6.8-9.9 6.8-16.3z"/>
              <path fill="#FBBC05" d="M12.5 28.5c-0.7-2-1.1-4.2-1.1-6.5s0.4-4.5 1.1-6.5l-7.4-5.8C2.9 14.5 2 19 2 24s0.9 9.5 3.1 13.8l7.4-5.8z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.2 15.9-6l-7.4-5.8c-2.1 1.4-4.8 2.2-8.5 2.2-6.2 0-11.5-4.2-13.3-9.9l-7.4 5.8C10.7 42.3 16.7 48 24 48z"/>
            </svg>
            Sign in with Google
          </a>
          <button onClick={() => setIsOpen(false)} className='button'>Cancel</button>
        </div>
      </div>
    </div>
  );
}
