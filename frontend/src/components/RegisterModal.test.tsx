import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterModal from './RegisterModal';

const navState = vi.hoisted(() => ({ pathname: '/register' }));
const oauth = vi.hoisted(() => ({ oauthLogin: vi.fn() }));

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

const locationMock = {
  href: '',
  protocol: 'http:',
  pathname: '/',
  reload: vi.fn(),
  assign: vi.fn(),
  replace: vi.fn(),
};

describe('RegisterModal', () => {
  beforeEach(() => {
    locationMock.href = '';
    oauth.oauthLogin.mockClear();
    vi.stubGlobal('location', locationMock);

    if (!(HTMLFormElement.prototype as any).__namedControls) {
      Object.defineProperty(HTMLFormElement.prototype, 'username', {
        configurable: true,
        get(this: HTMLFormElement) {
          return this.elements.namedItem('username');
        },
      });
      Object.defineProperty(HTMLFormElement.prototype, 'email', {
        configurable: true,
        get(this: HTMLFormElement) {
          return this.elements.namedItem('email');
        },
      });
      (HTMLFormElement.prototype as any).__namedControls = true;
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<RegisterModal open={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the form with a disabled continue button', () => {
    render(<RegisterModal open onClose={vi.fn()} />);
    expect(screen.getByText('register_modal.title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('register_modal.placeholder_username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('register_modal.placeholder_email')).toBeInTheDocument();
    expect(screen.getByText('register_modal.btn_continue')).toBeDisabled();
  });

  it('validates a short username', async () => {
    render(<RegisterModal open onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('register_modal.placeholder_username'), 'ab');
    expect(screen.getByText('register_modal.errors.username_short')).toBeInTheDocument();
  });

  it('validates a long username', async () => {
    render(<RegisterModal open onClose={vi.fn()} />);
    await userEvent.type(
      screen.getByPlaceholderText('register_modal.placeholder_username'),
      'a'.repeat(26)
    );
    expect(screen.getByText('register_modal.errors.username_long')).toBeInTheDocument();
  });

  it('validates invalid username characters', async () => {
    render(<RegisterModal open onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('register_modal.placeholder_username'), 'ab@#');
    expect(screen.getByText('register_modal.errors.username_invalid')).toBeInTheDocument();
  });

  it('validates the email field', async () => {
    render(<RegisterModal open onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('register_modal.placeholder_email'), 'not-an-email');
    expect(screen.getByText('register_modal.errors.email_invalid')).toBeInTheDocument();
  });

  it('enables continue with valid input and redirects on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    render(<RegisterModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('register_modal.placeholder_username'), 'alice');
    await userEvent.type(screen.getByPlaceholderText('register_modal.placeholder_email'), 'a@b.com');

    const button = screen.getByText('register_modal.btn_continue');
    expect(button).toBeEnabled();
    await userEvent.click(button);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(locationMock.href).toContain('/register?');
    expect(locationMock.href).toContain('username=alice');
  });

  it('shows an error when the username is taken', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    render(<RegisterModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('register_modal.placeholder_username'), 'alice');
    await userEvent.type(screen.getByPlaceholderText('register_modal.placeholder_email'), 'a@b.com');
    await userEvent.click(screen.getByText('register_modal.btn_continue'));

    await waitFor(() =>
      expect(screen.getByText('register_modal.errors.username_taken')).toBeInTheDocument()
    );
    expect(locationMock.href).toBe('');
  });

  it('shows an error when the email is taken', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });
    render(<RegisterModal open onClose={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('register_modal.placeholder_username'), 'alice');
    await userEvent.type(screen.getByPlaceholderText('register_modal.placeholder_email'), 'a@b.com');
    await userEvent.click(screen.getByText('register_modal.btn_continue'));

    await waitFor(() =>
      expect(screen.getByText('register_modal.errors.email_taken')).toBeInTheDocument()
    );
    expect(locationMock.href).toBe('');
  });

  it('returns early without fetching when local validation fails on submit', () => {
    global.fetch = vi.fn();
    render(<RegisterModal open onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText('register_modal.placeholder_username');
    fireEvent.submit(input.closest('form')!);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText('register_modal.errors.username_short')).toBeInTheDocument();
  });

  it('starts OAuth login for each provider', async () => {
    navState.pathname = '/somewhere';
    render(<RegisterModal open onClose={vi.fn()} />);

    await userEvent.click(screen.getByText('Google'));
    await userEvent.click(screen.getByText('GitHub'));
    await userEvent.click(screen.getByText('GitLab'));

    expect(oauth.oauthLogin).toHaveBeenNthCalledWith(1, 'google', '/somewhere');
    expect(oauth.oauthLogin).toHaveBeenNthCalledWith(2, 'github', '/somewhere');
    expect(oauth.oauthLogin).toHaveBeenNthCalledWith(3, 'gitlab', '/somewhere');
  });

  it('closes via the cancel button and the close icon', async () => {
    const onClose = vi.fn();
    render(<RegisterModal open onClose={onClose} />);

    await userEvent.click(screen.getByText('register_modal.btn_cancel'));
    await userEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
