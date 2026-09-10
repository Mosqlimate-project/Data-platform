import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from './Navbar';

const auth = vi.hoisted(() => ({
  user: null as null | { username: string; is_staff?: boolean },
  openLogin: vi.fn(),
  logout: vi.fn(),
}));

const themeState = vi.hoisted(() => ({ theme: 'light', setTheme: vi.fn() }));
const navState = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('./AuthProvider', () => ({
  useAuth: () => ({
    user: auth.user,
    openLogin: auth.openLogin,
    logout: auth.logout,
  }),
}));

vi.mock('./Language', () => ({
  default: () => <div data-testid="language-selector" />,
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: themeState.theme, setTheme: themeState.setTheme, resolvedTheme: themeState.theme }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
}));

describe('Navbar', () => {
  beforeEach(() => {
    auth.user = null;
    navState.pathname = '/';
    themeState.theme = 'light';
    auth.openLogin.mockClear();
    auth.logout.mockClear();
    themeState.setTheme.mockClear();
  });

  it('renders links, logo, theme toggle and login when logged out', () => {
    render(<Navbar />);

    expect(screen.getByAltText('Logo')).toBeInTheDocument();
    expect(screen.getByTestId('language-selector')).toBeInTheDocument();
    expect(screen.getByText('navbar.login')).toBeInTheDocument();
    expect(screen.queryByLabelText('Notifications')).not.toBeInTheDocument();
  });

  it('toggles the theme', async () => {
    render(<Navbar />);
    await userEvent.click(screen.getByLabelText('footer.theme'));
    expect(themeState.setTheme).toHaveBeenCalledWith('dark');
  });

  it('calls openLogin when the login button is clicked', async () => {
    render(<Navbar />);
    await userEvent.click(screen.getByText('navbar.login'));
    expect(auth.openLogin).toHaveBeenCalled();
  });

  it('opens and closes the dropdown menu', async () => {
    render(<Navbar />);

    expect(screen.queryByText('LinkedIn')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Menu'));
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('LinkedIn')).not.toBeInTheDocument();
  });

  it('closes the dropdown when a link inside is clicked', async () => {
    render(<Navbar />);
    await userEvent.click(screen.getByLabelText('Menu'));

    const github = screen.getByText('GitHub');
    await userEvent.click(github);
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
  });

  it('closes the dropdown when the LinkedIn link is clicked', () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText('Menu'));
    fireEvent.click(screen.getByText('LinkedIn'));
    expect(screen.queryByText('LinkedIn')).not.toBeInTheDocument();
  });

  it('renders the user menu with profile, admin and logout for a staff user', async () => {
    auth.user = { username: 'alice', is_staff: true };
    render(<Navbar />);

    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Menu'));
    expect(screen.getByText('navbar.profile')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Logout'));
    expect(auth.logout).toHaveBeenCalled();
    expect(screen.queryByText('navbar.profile')).not.toBeInTheDocument();
  });

  it('hides the admin link for non-staff users', async () => {
    auth.user = { username: 'bob', is_staff: false };
    render(<Navbar />);
    await userEvent.click(screen.getByLabelText('Menu'));

    expect(screen.getByText('navbar.profile')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('marks the active route with bold styling', () => {
    navState.pathname = '/models';
    render(<Navbar />);
    const modelsLinks = screen.getAllByText('navbar.models');
    expect(modelsLinks[0].className).toContain('font-bold');
  });

  it('renders the dark theme icon and toggles to light', async () => {
    themeState.theme = 'dark';
    render(<Navbar />);
    const themeBtn = screen.getByLabelText('footer.theme');
    expect(themeBtn.querySelector('svg')).toHaveAttribute('class', expect.stringContaining('text-blue-300'));
    await userEvent.click(themeBtn);
    expect(themeState.setTheme).toHaveBeenCalledWith('light');
  });

  it.each([
    ['/models', 'navbar.models'],
    ['/dashboard', 'navbar.dashboard'],
    ['/datastore', 'navbar.datastore'],
    ['/docs', 'navbar.docs'],
    ['/publications', 'navbar.publications'],
    ['/about', 'navbar.about'],
    ['/profile', 'navbar.profile'],
    ['/admin', 'Admin'],
  ])('highlights %s as active in the dropdown menu', (path, label) => {
    navState.pathname = path;
    auth.user = { username: 'alice', is_staff: true };
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText('Menu'));
    const list = screen.getByRole('list');
    const link = within(list).getByText(label).closest('a')!;
    expect(link.className).toContain('font-bold');
    fireEvent.click(link);
    expect(screen.queryByText('LinkedIn')).not.toBeInTheDocument();
  });
});
