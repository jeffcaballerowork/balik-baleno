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
          <a href='/api/auth/google' className='button button-primary' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width='18' height='18' viewBox='0 0 18 18' style={{ marginRight: '8px' }}>
              <path fill='#4285F4' d='M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92a8.77 8.77 0 0 0 2.52-6.61z'/>
              <path fill='#34A853' d='M9 17.64a8.77 8.77 0 0 0 6.07-2.22l-2.92-2.26a5.52 5.52 0 0 1-8.38-2.92H.9v2.26a8.77 8.77 0 0 0 8.1 7.14z'/>
              <path fill='#FBBC05' d='M4.62 10.22a5.52 5.52 0 0 1 0-4.44V3.52H.9a8.77 8.77 0 0 0 0 8.44l3.72-1.74z'/>
              <path fill='#EA4335' d='M9 3.52c2.4 0 4.56.83 6.25 2.45l2.92-2.92A8.77 8.77 0 0 0 .9 3.52l3.72 2.26a5.52 5.52 0 0 1 4.38-2.26z'/>
            </svg>
            Sign in with Google
          </a>
          <button onClick={() => setIsOpen(false)} className='button'>Cancel</button>
        </div>
      </div>
    </div>
  );
}
