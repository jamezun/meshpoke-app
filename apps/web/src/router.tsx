import { createMemoryRouter, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { PricingPage } from './pages/Pricing';
import { AppLayout } from './layouts/AppLayout';
import HowItWorksPage from './pages/HowItWorks';
import SafetyPage from './pages/Safety';
import AboutPage from './pages/About';
import VenueLandingPage from './pages/Venue';
import VenuePricingPage from './pages/VenuePricing';
import SupportPage from './pages/Support';
import { TermsPage, PrivacyPage } from './pages/Legal';
import { LoginPage } from './auth/Login';
import { SignupPage } from './auth/Signup';
import { PhoneVerifyPage } from './auth/PhoneVerify';

export function createRouter(opts: { memory?: boolean; initial?: string } = {}) {
  const routes = [
    { path: '/', element: <HomePage /> },
    { path: '/pricing', element: <PricingPage /> },
    { path: '/how-it-works', element: <HowItWorksPage /> },
    { path: '/safety', element: <SafetyPage /> },
    { path: '/about', element: <AboutPage /> },
    { path: '/venue', element: <VenueLandingPage /> },
    { path: '/venue/pricing', element: <VenuePricingPage /> },
    { path: '/support', element: <SupportPage /> },
    { path: '/terms', element: <TermsPage /> },
    { path: '/privacy', element: <PrivacyPage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/signup', element: <SignupPage /> },
    { path: '/verify-phone', element: <PhoneVerifyPage /> },
    { path: '/app/*', element: <AppLayout /> },
  ];
  const router = opts.memory ? createMemoryRouter(routes, { initialEntries: [opts.initial ?? '/'] }) : createBrowserRouter(routes);
  return { Router: () => <RouterProvider router={router} /> };
}
