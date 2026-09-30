import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { routes } from './routes';

describe('scaffold', () => {
  it('BR-GEN-05 index.html is RTL Arabic', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
    expect(html).toContain('<html lang="ar" dir="rtl">');
  });

  it('renders the login route', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/login'] });
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument();
  });
});
