import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import NetworkBackground from './NetworkBackground';

function makeCtx() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  };
}

let rafCallbacks: FrameRequestCallback[] = [];
let ctx: ReturnType<typeof makeCtx>;

describe('NetworkBackground', () => {
  beforeEach(() => {
    rafCallbacks = [];
    ctx = makeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as any);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a canvas and initializes the 2d context', () => {
    const { container } = render(<NetworkBackground />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    expect(ctx.setTransform).toHaveBeenCalled();
  });

  it('runs animation frames drawing points and lines', () => {
    render(<NetworkBackground />);
    expect(rafCallbacks.length).toBe(1);

    act(() => {
      rafCallbacks.shift()!(0);
    });

    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(rafCallbacks.length).toBe(1);
  });

  it('draws mouse interaction lines on mousemove and handles mouseleave', () => {
    const { container } = render(<NetworkBackground />);
    const canvas = container.querySelector('canvas')!;

    act(() => {
      rafCallbacks.shift()!(0);
    });

    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10, bubbles: true }));
    act(() => {
      rafCallbacks.shift()!(0);
    });
    expect(ctx.stroke).toHaveBeenCalled();

    canvas.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    expect(canvas).toBeInTheDocument();
  });

  it('uses the dark palette when dark mode is active', () => {
    document.documentElement.classList.add('dark');
    render(<NetworkBackground />);

    act(() => {
      rafCallbacks.shift()!(0);
    });

    expect(ctx.arc).toHaveBeenCalled();
    document.documentElement.classList.remove('dark');
  });

  it('recomputes the size on window resize', () => {
    render(<NetworkBackground />);
    expect(ctx.setTransform).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(ctx.setTransform).toHaveBeenCalledTimes(2);
  });

  it('cancels the animation frame on unmount', () => {
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);

    const { unmount } = render(<NetworkBackground />);
    unmount();

    expect(cancel).toHaveBeenCalled();
  });

  it('returns early when the 2d context is unavailable', () => {
    (HTMLCanvasElement.prototype.getContext as any).mockReturnValue(null);
    const { container } = render(<NetworkBackground />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(rafCallbacks.length).toBe(0);
  });
});
