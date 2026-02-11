'use client';

import zxcvbn from 'zxcvbn';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';
import { useTranslation } from 'react-i18next';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const { t } = useTranslation('common');
  const params = useSearchParams();
  const router = useRouter();

  const data = params.get('data');
  const initialUsername = params.get('username') || '';
  const initialEmail = params.get('email') || '';

  const [loading, setLoading] = useState(!!data);
  const [oauthDecoded, setOauthDecoded] = useState<any | null>(null);

  const [username, setUsername] = useState(initialUsername);
  const [email, setEmail] = useState(initialEmail);

  const [password, setPassword] = useState('');
  const [passwordScore, setPasswordScore] = useState<number | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [homepage, setHomepage] = useState('');

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [agree, setAgree] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');

  const ran = useRef(false);

  const isEmailLocked = !!initialEmail || !!oauthDecoded?.email;
  const isUsernameLocked = !!initialUsername || !!oauthDecoded?.username;

  useEffect(() => {
    if (!data || ran.current) return;
    ran.current = true;

    async function fetchDecoded(data: string) {
      setLoading(true);
      try {
        const res = await fetch(`/api/auth/decode?data=${encodeURIComponent(data)}`);

        if (!res.ok) throw new Error();
        const decoded = await res.json();

        setOauthDecoded(decoded);
        setEmail(decoded.email ?? initialEmail);
        setUsername(decoded.username ?? initialUsername);
      } catch {
        toast.error(t('register_page.errors.auth_expired'));
      } finally {
        setLoading(false);
      }
    }

    fetchDecoded(data);
  }, [data, t, initialEmail, initialUsername]);

  function handleAvatarChange(file: File | null) {
    setAvatar(file);
    setAvatarUrl(file ? URL.createObjectURL(file) : null);
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setPassword(value);

    const { score, feedback } = zxcvbn(value);
    setPasswordScore(score);
    setPasswordFeedback(feedback.warning || '');
    setPasswordError('');
  }

  const validateUsername = debounce(async (value: string) => {
    if (value.length < 4) return setUsernameError(t('register_page.errors.username_short'));
    if (value.length > 25) return setUsernameError(t('register_page.errors.username_long'));

    const pattern = /^[a-zA-Z0-9._]+$/;
    if (!pattern.test(value)) return setUsernameError(t('register_page.errors.username_invalid'));

    try {
      const res = await fetch(
        `/api/user/check-username?username=${encodeURIComponent(value)}`
      );

      if (!res.ok) {
        setUsernameError(t('register_page.errors.username_taken'));
        return;
      }

      setUsernameError('');
    } catch {
      setUsernameError(t('register_page.errors.username_check_fail'));
    }
  }, 1000);

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!agree) return;
    if (usernameError) return;

    setEmailError('');
    setPasswordError('');

    if (passwordScore !== null && passwordScore < 2) {
      setPasswordError(t('register_page.errors.password_weak'));
      return;
    }

    const form = new FormData();
    form.append('username', username);
    form.append('password', password);
    form.append('email', email);
    form.append('first_name', firstName);
    form.append('last_name', lastName);
    form.append('homepage_url', homepage || '');
    if (data) form.append('oauth_data', data);
    if (avatar) form.append('avatar_file', avatar);

    try {
      const res = await fetch('/api/user/register', {
        method: 'POST',
        body: form,
      });

      const responseData = await res.json();

      if (!res.ok) {
        if (responseData.message === "Username already registered") {
          setUsernameError(t('register_page.errors.username_taken_api'));
        } else if (responseData.message === "Email already registered") {
          setEmailError(t('register_page.errors.email_taken_api'));
        } else {
          toast.error(responseData.message || t('register_page.errors.create_fail'));
        }
        return;
      }

      toast.success(t('register_page.success'));
      window.location.href = "/";
    } catch (error) {
      toast.error(t('register_page.errors.generic_error'));
    }
  }

  const strengthLabels = [
    t('register_page.password_strength.very_weak'),
    t('register_page.password_strength.weak'),
    t('register_page.password_strength.fair'),
    t('register_page.password_strength.good'),
    t('register_page.password_strength.strong')
  ];

  return (
    <div className="flex justify-center p-6 relative">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-3xl bg-[var(--color-bg)] rounded-2xl shadow-xl 
                   border border-[var(--color-border)] p-8 flex flex-col items-center"
      >
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 
                          flex items-center justify-center rounded-2xl z-10">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 
                            border-t-transparent rounded-full"></div>
          </div>
        )}

        <div className="relative mb-6">
          <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-blue-500 shadow-md">
            {avatarUrl ? (
              <img src={avatarUrl} className="object-cover w-full h-full" />
            ) : (
              <div className="bg-[var(--color-hover)] w-full h-full 
                              flex items-center justify-center text-[var(--color-text)] opacity-50 text-sm">
                {t('register_page.no_avatar')}
              </div>
            )}
          </div>

          <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 
                             text-white rounded-full p-2 cursor-pointer shadow-md">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)}
              className="hidden"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536M9 13l6-6 3 3L12 16H9v-3z"
              />
            </svg>
          </label>
        </div>

        <h1 className="text-2xl font-bold text-center mb-1 text-[var(--color-text)]">
          {t('register_page.title')}
        </h1>
        <p className="text-center text-[var(--color-text)] opacity-60 mb-8">
          {t('register_page.subtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Input
            label={t('register_page.labels.username')}
            value={username}
            onChange={handleUsernameChange}
            error={usernameError}
            required
            className="md:col-span-2"
          />

          <Input
            label={t('register_page.labels.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isEmailLocked}
            error={emailError}
            required
            className="md:col-span-2"
          />

          <div className="md:col-span-2">
            <Input
              label={t('register_page.labels.password')}
              type="password"
              value={password}
              onChange={handlePasswordChange}
              error={passwordError}
              required
            />

            {passwordScore !== null && (
              <p
                className={`text-sm mt-1 ${passwordScore < 2
                  ? 'text-red-500'
                  : passwordScore < 4
                    ? 'text-yellow-500'
                    : 'text-green-500'
                  }`}
              >
                {passwordScore < 2
                  ? t('register_page.errors.password_weak')
                  : passwordFeedback || strengthLabels[passwordScore]}
              </p>
            )}
          </div>

          <Input
            label={t('register_page.labels.first_name')}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />

          <Input
            label={t('register_page.labels.last_name')}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />

          <Input
            label={t('register_page.labels.homepage')}
            value={homepage}
            onChange={(e) => setHomepage(e.target.value)}
            placeholder={t('register_page.placeholders.homepage')}
            className="md:col-span-2"
          />
        </div>

        <div className="flex items-center mt-6">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mr-2 accent-blue-600"
          />
          <span className="text-sm text-[var(--color-text)] opacity-80">
            {t('register_page.terms.accept')}{' '}
            <a href="#" className="text-blue-600 hover:underline">
              {t('register_page.terms.tos')}
            </a>{' '}
            {t('register_page.terms.and')}{' '}
            <a href="#" className="text-blue-600 hover:underline">
              {t('register_page.terms.coc')}
            </a>
          </span>
        </div>

        <button
          type="submit"
          disabled={
            !agree ||
            loading ||
            !!usernameError ||
            !username ||
            !password ||
            (passwordScore !== null && passwordScore < 2)
          }
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 
                     text-white font-medium rounded-md py-2 transition-all shadow-sm hover:shadow-md"
        >
          {t('register_page.btn_create')}
        </button>
      </form>
    </div>
  );
}

function Input({
  label,
  error,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm text-[var(--color-text)] opacity-80 mb-1">
        {label}
      </label>
      <input
        {...props}
        className="w-full border border-[var(--color-border)] rounded-md 
                   px-3 py-2 text-sm bg-[var(--color-bg)] 
                   text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 outline-none
                   disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
