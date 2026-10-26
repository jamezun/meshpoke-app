import { createMemoryRouter, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { PricingPage } from './pages/Pricing';
import { AppLayout } from './layouts/AppLayout';

export function createRouter(opts: { memory?: boolean; initial?: string } = {}) {
  const routes = [
    { path: '/', element: <HomePage /> },
    { path: '/pricing', element: <PricingPage /> },
    { path: '/app/*', element: <AppLayout /> },
  ];
  const router = opts.memory ? createMemoryRouter(routes, { initialEntries: [opts.initial ?? '/'] }) : createBrowserRouter(routes);
  return { Router: () => <RouterProvider router={router} /> };
}
