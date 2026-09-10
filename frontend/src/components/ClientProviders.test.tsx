import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ClientProviders from './ClientProviders';

vi.mock('framer-motion', () => {
  const MotionDiv = ({ children, ...rest }: any) => <div {...rest}>{children}</div>;
  return {
    motion: new Proxy(
      {},
      {
        get: () => MotionDiv,
      }
    ),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: any) => <>{children}</>,
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), resolvedTheme: 'light' }),
}));

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  I18nextProvider: ({ children }: any) => <>{children}</>,
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en', changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() },
  }),
}));

vi.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('ClientProviders', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children and the toaster', async () => {
    render(
      <ClientProviders>
        <div data-testid="child">hello</div>
      </ClientProviders>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('toaster')).toBeInTheDocument();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/me/'));
  });
});
