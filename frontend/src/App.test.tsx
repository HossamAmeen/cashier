import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { AuthProvider } from './auth/AuthProvider';
import { routes } from './routes';

describe('scaffold', () => {
  it('BR-GEN-05 index.html is RTL Arabic', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
    expect(html).toContain('<html lang="ar" dir="rtl">');
  });

  it('renders the login route', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter(routes, { initialEntries: ['/login'] });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).toBeInTheDocument();
  });
});

