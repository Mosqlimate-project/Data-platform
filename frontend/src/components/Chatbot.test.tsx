import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chatbot from './Chatbot';

vi.mock('react-markdown', () => ({
  default: ({ children, components }: any) => {
    const text = String(children);
    if (components?.code && text.includes('```')) {
      return (
        <div data-testid="md-code">
          {components.code({ inline: false, className: 'language-js', children: 'const a = 1;\n' })}
        </div>
      );
    }
    if (components?.code && text.includes('`')) {
      return <div data-testid="md-inline">{components.code({ inline: true, className: '', children: 'x' })}</div>;
    }
    return <div>{children}</div>;
  },
}));

vi.mock('remark-gfm', () => ({ default: vi.fn() }));

vi.mock('prism-react-renderer', () => ({
  Highlight: ({ children }: any) =>
    children({
      className: 'highlight',
      style: {},
      tokens: [[{ types: ['keyword'], content: 'const' }]],
      getLineProps: () => ({}),
      getTokenProps: () => ({}),
    }),
}));

vi.mock('@/components/chatbot/Icon', () => ({
  default: () => <div data-testid="chat-icon" />,
}));

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.CONNECTING;
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  addEventListener() {}
  removeEventListener() {}

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  message(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

const locationMock = {
  href: '',
  protocol: 'http:',
  pathname: '/',
  reload: vi.fn(),
};

async function renderOpenChatbot() {
  const utils = render(<Chatbot />);
  await userEvent.click(screen.getByTestId('chat-icon').closest('button')!);
  await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
  const ws = MockWebSocket.instances[0];
  act(() => ws.open());
  return { ...utils, ws };
}

describe('Chatbot', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('location', locationMock);
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the floating button and opens the chat, connecting the socket', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ session_key: 'abc' }) });
    render(<Chatbot />);

    expect(screen.getByTestId('chat-icon')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('chat-icon').closest('button')!);
    expect(screen.getByText('Mosqlimate Assistant')).toBeInTheDocument();

    await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
    expect(MockWebSocket.instances[0].url).toContain('/ws/chat/abc/?lang=en');
  });

  it('sends a message, shows waiting and renders bot responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ session_key: 'abc' }) });
    const { ws } = await renderOpenChatbot();

    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'hello');
    const sendButton = input.parentElement!.querySelector('button')!;
    await userEvent.click(sendButton);

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('waiting')).toBeInTheDocument();
    expect(ws.sent.some((s) => s.includes('hello'))).toBe(true);

    act(() => ws.message({ text: { msg: 'hi there', source: 'bot' } }));
    expect(screen.getByText('hi there')).toBeInTheDocument();
    expect(screen.queryByText('waiting')).not.toBeInTheDocument();
  });

  it('sends on Enter and ignores messages without text', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ session_key: 'abc' }) });
    const { ws } = await renderOpenChatbot();

    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'bye{enter}');
    expect(screen.getByText('bye')).toBeInTheDocument();

    act(() => ws.message({ noText: true }));
    expect(screen.queryByText('noText')).not.toBeInTheDocument();
  });

  it('renders fenced and inline code from markdown messages', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ session_key: 'abc' }) });
    const { ws } = await renderOpenChatbot();

    act(() => ws.message({ text: { msg: '```js\nconst a = 1;\n```', source: 'bot' } }));
    expect(screen.getByTestId('md-code')).toBeInTheDocument();
    expect(document.querySelector('pre')).toBeInTheDocument();

    act(() => ws.message({ text: { msg: '`x`', source: 'bot' } }));
    expect(screen.getByTestId('md-inline')).toBeInTheDocument();
  });

  it('expands, shrinks and closes the chat window', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ session_key: 'abc' }) });
    await renderOpenChatbot();

    await userEvent.click(screen.getByTitle('Expand'));
    expect(screen.getByTitle('Shrink')).toBeInTheDocument();

    await userEvent.click(screen.getByTitle('Shrink'));
    expect(screen.getByTitle('Expand')).toBeInTheDocument();

    await userEvent.click(screen.getByTitle('Close'));
    expect(screen.getByTestId('chat-icon')).toBeInTheDocument();
    expect(screen.queryByText('Mosqlimate Assistant')).not.toBeInTheDocument();
  });

  it('sends pings while the socket is open', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ session_key: 'abc' }) });
    const intervalSpy = vi.spyOn(global, 'setInterval');
    const { ws } = await renderOpenChatbot();

    const pingCall = intervalSpy.mock.calls.find((c) => c[1] === 10000);
    expect(pingCall).toBeDefined();
    const callback = pingCall![0] as () => void;
    act(() => callback());
    expect(ws.sent.some((s) => s.includes('ping'))).toBe(true);
  });

  it('closes the socket on unmount', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ session_key: 'abc' }) });
    const { ws, unmount } = await renderOpenChatbot();

    unmount();
    expect(ws.closed).toBe(true);
  });

  it('logs an error when session-key fetch fails', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error('down'));

    render(<Chatbot />);
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(MockWebSocket.instances.length).toBe(0);
  });

  it('does not connect when the session-key response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    render(<Chatbot />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/session-key'));
    expect(MockWebSocket.instances.length).toBe(0);
  });
});
