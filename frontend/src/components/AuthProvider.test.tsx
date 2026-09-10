import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AuthProvider, useAuth } from './AuthProvider';

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

vi.mock('./LoginModal', () => ({
  default: ({ open, onClose, onCancel }: any) => {
    if (!open) return null;
    return (
      <div>
        <h2>login_modal.title</h2>
        <button onClick={() => {
          onClose();
          onCancel?.();
        }}>
          login_modal.btn_cancel
        </button>
      </div>
    );
  },
}));

vi.mock('./RegisterModal', () => ({
  default: ({ open, onClose }: any) => {
    if (!open) return null;
    return (
      <div>
        <h2>register_modal.title</h2>
        <button onClick={() => onClose()}>register_modal.close</button>
      </div>
    );
  },
}));

const locationMock = {
  href: '',
  protocol: 'http:',
  pathname: '/',
  reload: vi.fn(),
  assign: vi.fn(),
  replace: vi.fn(),
};

function Consumer() {
  const { user, loadingUser, logout, openLogin, openRegister, fetchUser } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loadingUser)}</span>
      <span data-testid="user">{user ? user.username : 'none'}</span>
      <button onClick={openLogin}>open-login</button>
      <button onClick={openRegister}>open-register</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => fetchUser()}>refetch</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('location', locationMock);
    locationMock.href = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets user on successful /api/me/ fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', username: 'alice', email: 'a@b.c' }),
    });

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice'));
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(global.fetch).toHaveBeenCalledWith('/api/me/');
  });

  it('sets user to null when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('sets user to null and warns when fetch throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(warn).toHaveBeenCalled();
  });

  it('refetches the user when fetchUser is called', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '1', username: 'alice', email: 'a@b.c' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '2', username: 'bob', email: 'b@b.c' }) });

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice'));

    await userEvent.click(screen.getByText('refetch'));

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('bob'));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('logout posts to /api/auth/logout, clears user and redirects', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '1', username: 'alice', email: 'a@b.c' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice'));

    await userEvent.click(screen.getByText('logout'));

    expect(global.fetch).toHaveBeenLastCalledWith('/api/auth/logout', { method: 'POST' });
    expect(locationMock.href).toBe('/');
  });

  it('logs error when logout fetch throws', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: '1', username: 'alice', email: 'a@b.c' }) })
      .mockRejectedValueOnce(new Error('boom'));

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice'));

    await userEvent.click(screen.getByText('logout'));

    expect(err).toHaveBeenCalled();
  });

  it('opens the login and register modals', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await userEvent.click(screen.getByText('open-login'));
    expect(screen.getByText('login_modal.title')).toBeInTheDocument();

    await userEvent.click(screen.getByText('open-register'));
    expect(screen.getByText('register_modal.title')).toBeInTheDocument();
  });

  it('useAuth throws when used outside of AuthProvider', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow('useAuth must be used within AuthProvider');
    err.mockRestore();
  });

  it('skips the duplicate initial fetch under StrictMode double effects', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', username: 'alice', email: 'a@b.c' }),
    });

    render(
      <React.StrictMode>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </React.StrictMode>
    );

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('alice'));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('dispatches login-cancelled when the login modal cancel is clicked', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const dispatch = vi.spyOn(window, 'dispatchEvent');

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await userEvent.click(screen.getByText('open-login'));
    await userEvent.click(screen.getByText('login_modal.btn_cancel'));

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'login-cancelled' }));
  });

  it('closes the register modal', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await userEvent.click(screen.getByText('open-register'));
    expect(screen.getByText('register_modal.title')).toBeInTheDocument();
    await userEvent.click(screen.getByText('register_modal.close'));
    expect(screen.queryByText('register_modal.title')).not.toBeInTheDocument();
  });
});
