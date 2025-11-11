'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function RegisterPage() {
  const params = useSearchParams();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    setUsername(params.get('username') || '');
    setEmail(params.get('email') || '');
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError('');
    setEmailError('');

    try {
      const usernameResp = await apiFetch(`/user/check-username/?username=${username}`);
      const emailResp = await apiFetch(`/user/check-email/?email=${email}`);

      if (!usernameResp.available) setUsernameError('Username is already taken');
      if (!emailResp.available) setEmailError('Email is already registered');

      if (usernameResp.available && emailResp.available) {
        console.log("Success, proceed to password step");
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Complete your registration</h2>

        <div className="mb-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {usernameError && <p className="text-red-500 text-xs mt-1">{usernameError}</p>}
        </div>

        <div className="mb-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border border-gray-300 dark:border-neutral-700 rounded-md px-3 py-2 bg-transparent dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md py-2 mt-3 transition-all shadow-sm hover:shadow-md"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
