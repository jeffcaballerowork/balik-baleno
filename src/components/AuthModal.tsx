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
            <img src="/google-g-logo.svg" alt="Google logo" width="20" height="20" style={{ display: 'block' }} />
            Sign in with Google
          </a>
          <button onClick={() => setIsOpen(false)} className='button'>Cancel</button>
        </div>
      </div>
    </div>
  );
}
