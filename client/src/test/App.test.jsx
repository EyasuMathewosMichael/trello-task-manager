import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock socket.io-client to avoid real connections in tests
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock axios to avoid real HTTP calls in tests
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal();
  const mockAxios = {
    ...actual,
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn().mockResolvedValue({ data: [] }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
    })),
    post: vi.fn().mockRejectedValue(new Error('no refresh token')),
  };
  return { default: mockAxios, ...mockAxios };
});

import { AuthProvider } from '../context/AuthContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { SocketProvider } from '../context/SocketContext.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import BoardListPage from '../pages/BoardListPage.jsx';

describe('App pages', () => {
  it('renders LoginPage', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeDefined();
  });

  it('renders BoardListPage', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <BoardListPage />
        </AuthProvider>
      </MemoryRouter>
    );
    // The page renders a "My Boards" heading
    expect(screen.getByRole('heading', { name: 'My Boards' })).toBeDefined();
  });

  it('AuthProvider renders children', () => {
    render(
      <AuthProvider>
        <div>auth child</div>
      </AuthProvider>
    );
    expect(screen.getByText('auth child')).toBeDefined();
  });

  it('ThemeProvider renders children', () => {
    render(
      <ThemeProvider>
        <div>theme child</div>
      </ThemeProvider>
    );
    expect(screen.getByText('theme child')).toBeDefined();
  });
});
