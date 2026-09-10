import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import NetworkBackground from './NetworkBackground';

const refState = vi.hoisted(() => ({ canvasNull: false, counter: 0 }));

vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof import('react')>();
  return {
    ...react,
    useRef: (initial?: any) => {
      refState.counter += 1;
      if (refState.canvasNull && refState.counter === 1) {
        return {
          get current() {
            return null;
          },
          set current(_v: unknown) {},
        };
      }
      return react.useRef(initial);
    },
  };
});

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
    refState.canvasNull = false;
    refState.counter = 0;
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

  it('falls back to dpr 1 when devicePixelRatio is falsy', () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true });
    render(<NetworkBackground />);
    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
  });

  it('stops animating after unmount', () => {
    const { unmount } = render(<NetworkBackground />);
    expect(rafCallbacks.length).toBe(1);
    unmount();
    act(() => {
      rafCallbacks.shift()!(0);
    });
    expect(rafCallbacks.length).toBe(0);
  });

  it('bounces points off the canvas boundaries', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<NetworkBackground />);
    act(() => {
      rafCallbacks.shift()!(0);
    });
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(rafCallbacks.length).toBe(1);
  });

  it('draws dark mouse lines when dark mode is active', () => {
    document.documentElement.classList.add('dark');
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
    document.documentElement.classList.remove('dark');
  });

  it('returns early when the canvas ref is null', () => {
    refState.canvasNull = true;
    const { container } = render(<NetworkBackground />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
    expect(rafCallbacks.length).toBe(0);
  });
});
