import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Mock Next.js router
global.jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (global as any).jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) { }
  disconnect() { }
  observe(target: Element) { }
  unobserve(target: Element) { }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as any;

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock fetch
global.fetch = (global as any).jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: (global as any).jest.fn(),
  setItem: (global as any).jest.fn(),
  removeItem: (global as any).jest.fn(),
  clear: (global as any).jest.fn(),
  length: 0,
  key: (global as any).jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: (global as any).jest.fn(),
  setItem: (global as any).jest.fn(),
  removeItem: (global as any).jest.fn(),
  clear: (global as any).jest.fn(),
  length: 0,
  key: (global as any).jest.fn(),
};
global.sessionStorage = sessionStorageMock as any;

// Set up environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';