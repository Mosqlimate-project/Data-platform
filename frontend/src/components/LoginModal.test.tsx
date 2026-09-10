import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginModal from './LoginModal';

const authState = vi.hoisted(() => ({
  openRegister: vi.fn(),
  fetchUser: vi.fn().mockResolvedValue(undefined),
}));

const navState = vi.hoisted(() => ({ pathname: '/' }));
const oauth = vi.hoisted(() => ({ oauthLogin: vi.fn() }));
const cookies = vi.hoisted(() => ({ remove: vi.fn(), get: vi.fn(), set: vi.fn() }));

vi.mock('./AuthProvider', () => ({
  useAuth: () => ({ openRegister: authState.openRegister, fetchUser: authState.fetchUser }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
}));

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

vi.mock('@/lib/api/auth', () => ({
  oauthLogin: oauth.oauthLogin,
}));

vi.mock('js-cookie', () => ({
  __esModule: true,
  default: cookies,
}));

const locationMock = {
  href: '',
  protocol: 'http:',
  pathname: '/',
  reload: vi.fn(),
  assign: vi.fn(),
  replace: vi.fn(),
};

describe('LoginModal', () => {
  beforeEach(() => {
    navState.pathname = '/';
    locationMock.href = '';
    authState.openRegister.mockClear();
    authState.fetchUser.mockClear();
    oauth.oauthLogin.mockClear();
    cookies.remove.mockClear();
    vi.stubGlobal('location', locationMock);
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<LoginModal open={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the form when open', () => {
    render(<LoginModal open onClose={vi.fn()} />);
    expect(screen.getByText('login_modal.title')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('GitLab')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('login_modal.placeholder_username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('login_modal.placeholder_password')).toBeInTheDocument();
    expect(screen.getByText('login_modal.btn_signin')).toBeInTheDocument();
  });

  it('starts OAuth login for each provider', async () => {
    render(<LoginModal open onClose={vi.fn()} />);

    await userEvent.click(screen.getByText('Google'));
    await userEvent.click(screen.getByText('GitHub'));
    await userEvent.click(screen.getByText('GitLab'));

    expect(oauth.oauthLogin).toHaveBeenNthCalledWith(1, 'google', '/');
    expect(oauth.oauthLogin).toHaveBeenNthCalledWith(2, 'github', '/');
    expect(oauth.oauthLogin).toHaveBeenNthCalledWith(3, 'gitlab', '/');
  });

  it('submits credentials, refetches the user and reloads on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const onClose = vi.fn();
    render(<LoginModal open onClose={onClose} />);

    await userEvent.type(screen.getByPlaceholderText('login_modal.placeholder_username'), 'alice');
    await userEvent.type(screen.getByPlaceholderText('login_modal.placeholder_password'), 'secret');
    await userEvent.click(screen.getByText('login_modal.btn_signin'));

    await waitFor(() => expect(authState.fetchUser).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/set-session',
      expect.objectContaining({ method: 'POST' })
    );
    expect(onClose).toHaveBeenCalled();
    expect(locationMock.reload).toHaveBeenCalled();
  });

  it('alerts and does not close on failed login', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const onClose = vi.fn();
    render(<LoginModal open onClose={onClose} />);

    await userEvent.type(screen.getByPlaceholderText('login_modal.placeholder_username'), 'alice');
    await userEvent.type(screen.getByPlaceholderText('login_modal.placeholder_password'), 'bad');
    await userEvent.click(screen.getByText('login_modal.btn_signin'));

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('login_modal.alert_invalid'));
    expect(authState.fetchUser).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes and opens the register modal', async () => {
    const onClose = vi.fn();
    render(<LoginModal open onClose={onClose} />);

    await userEvent.click(screen.getByText('login_modal.register_prompt'));
    expect(onClose).toHaveBeenCalled();
    expect(authState.openRegister).toHaveBeenCalled();
  });

  it('cancel removes the cookie and closes without redirect on public routes', async () => {
    const onClose = vi.fn();
    render(<LoginModal open onClose={onClose} />);

    await userEvent.click(screen.getByText('login_modal.btn_cancel'));
    expect(cookies.remove).toHaveBeenCalledWith('requires_auth', { path: '/' });
    expect(onClose).toHaveBeenCalled();
    expect(locationMock.href).toBe('');
  });

  it('cancel redirects home when on a protected route', async () => {
    navState.pathname = '/profile';
    const onClose = vi.fn();
    render(<LoginModal open onClose={onClose} />);

    await userEvent.click(screen.getByText('login_modal.btn_cancel'));
    expect(locationMock.href).toBe('/');
  });
});
