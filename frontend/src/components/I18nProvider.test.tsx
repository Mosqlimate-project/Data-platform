import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import I18nProvider from './I18nProvider';

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  I18nextProvider: ({ children }: any) => <div data-testid="i18next-provider">{children}</div>,
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en', changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() },
  }),
}));

describe('I18nProvider', () => {
  it('renders children after mounting', () => {
    render(
      <I18nProvider>
        <span data-testid="child">content</span>
      </I18nProvider>
    );

    expect(screen.getByTestId('i18next-provider')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
