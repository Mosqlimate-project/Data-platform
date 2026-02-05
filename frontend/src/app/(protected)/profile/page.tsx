'use client';

import { useAuth } from '@/components/AuthProvider';
import { Loader2, Upload } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ProfileData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  homepage: string;
  avatar_url: string;
}

export default function ProfilePage() {
  const { t } = useTranslation('common');
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    homepage: ''
  });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile/');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setFormData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            homepage: data.homepage || ''
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    if (!profile && authUser) {
      setFormData({
        first_name: authUser.first_name || '',
        last_name: authUser.last_name || '',
        homepage: ''
      });
    }
  }, [authUser, profile]);

  const handleUpdateProfile = async () => {
    setUpdating(true);
    try {
      const res = await fetch('/api/user/profile/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, ...formData } : null);
      } else {
        const err = await res.json();
        alert(err.message || t("profile.alerts.update_fail"));
      }
    } catch (error) {
      console.error(error);
      alert(t("profile.alerts.update_error"));
    } finally {
      setUpdating(false);
    }
  };

  const handleAvatarClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(t("profile.alerts.size_limit"));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/user/profile/avatar/', {
        method: 'POST',
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => prev ? { ...prev, avatar_url: data.avatar_url } : null);
      } else {
        const err = await res.json();
        alert(err.message || t("profile.alerts.upload_fail"));
      }
    } catch (error) {
      console.error(error);
      alert(t("profile.alerts.upload_error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isLoading = loading;
  const displayUser = profile || (authUser as unknown as ProfileData);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-neutral-700 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('profile.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('profile.description')}
        </p>
      </div>

      <div className="bg-[var(--color-bg)] rounded-xl border border-gray-200 dark:border-neutral-700 p-6">
        <div className="flex flex-col-reverse md:flex-row gap-8 items-start">

          <div className="flex-1 space-y-5 w-full">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.username')}
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-500 cursor-not-allowed text-sm">
                  {isLoading ? t('profile.loading') : displayUser?.username}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.email')}
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-500 cursor-not-allowed text-sm">
                  {isLoading ? t('profile.loading') : displayUser?.email}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.first_name')}
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  maxLength={150}
                  placeholder=""
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('profile.last_name')}
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  maxLength={150}
                  placeholder=""
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('profile.homepage')}
              </label>
              <input
                type="url"
                value={formData.homepage}
                onChange={(e) => setFormData({ ...formData, homepage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                maxLength={250}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 md:w-auto w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 md:self-center self-start">
              {t('profile.profile_picture')}
            </label>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />

            <div
              onClick={handleAvatarClick}
              className={`h-40 w-40 rounded-full overflow-hidden border-4 border-gray-100 dark:border-neutral-800 shadow-sm relative group cursor-pointer bg-gray-50 dark:bg-neutral-900 ${uploading ? 'cursor-wait' : ''}`}
            >
              {uploading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}

              {isLoading ? (
                <div className="animate-pulse bg-gray-200 dark:bg-neutral-800 w-full h-full" />
              ) : displayUser?.avatar_url ? (
                <img
                  src={displayUser.avatar_url}
                  alt={displayUser.username}
                  className="object-cover w-full h-full transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-bold">
                  {displayUser?.username?.charAt(0).toUpperCase()}
                </div>
              )}

              {!uploading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-6 h-6 text-white mb-1" />
                  <span className="text-white text-xs font-medium uppercase tracking-wide">{t('profile.change')}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 text-center max-w-[160px]">
              {t('profile.upload_hint')}
            </p>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-neutral-700 flex justify-end">
          <button
            onClick={handleUpdateProfile}
            disabled={updating || isLoading}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {updating && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('profile.update_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}
