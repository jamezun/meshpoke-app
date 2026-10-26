import { createMemoryRouter, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { PricingPage } from './pages/Pricing';
import { AppLayout } from './layouts/AppLayout';
import HowItWorksPage from './pages/HowItWorks';
import SafetyPage from './pages/Safety';
import AboutPage from './pages/About';
import VenueLandingPage from './pages/Venue';
import VenuePricingPage from './pages/VenuePricing';
import { VenueClaimPage } from './pages/VenueClaim';
import { MerchantPortalPage } from './pages/MerchantPortal';
import { AdminPage } from './pages/Admin';
import SupportPage from './pages/Support';
import { TermsPage, PrivacyPage } from './pages/Legal';
import { LoginPage } from './auth/Login';
import RoomsPage from './pages/app/Rooms.js';
import InboxPage, { PeopleYouMetPage } from './pages/app/Inbox.js';
import CrewsPage from './pages/app/Crews.js';
import { SignupPage } from './auth/Signup';
import { PhoneVerifyPage } from './auth/PhoneVerify';
import { SettingsPage } from './layouts/AppLayout';
import { AppPage } from './pages/app/Placeholder';
import { ProfileEditorPage } from './pages/app/ProfileEditor';

export function createRouter(opts: { memory?: boolean; initial?: string } = {}) {
  const routes = [
    { path: '/', element: <HomePage /> },
    { path: '/pricing', element: <PricingPage /> },
    { path: '/how-it-works', element: <HowItWorksPage /> },
    { path: '/safety', element: <SafetyPage /> },
    { path: '/about', element: <AboutPage /> },
    { path: '/venue', element: <VenueLandingPage /> },
    { path: '/venue/pricing', element: <VenuePricingPage /> },
    { path: '/venue/claim', element: <VenueClaimPage /> },
    { path: '/merchant', element: <MerchantPortalPage /> },
    { path: '/admin', element: <AdminPage /> },
    { path: '/support', element: <SupportPage /> },
    { path: '/terms', element: <TermsPage /> },
    { path: '/privacy', element: <PrivacyPage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/signup', element: <SignupPage /> },
    { path: '/verify-phone', element: <PhoneVerifyPage /> },
    {
      path: '/app',
      element: <AppLayout />,
      children: [
        { index: true, element: <AppPage title="Desk companion" note="Your MeshPoke hub — the full map lives in the mobile app." /> },
        { path: 'inbox', element: <InboxPage /> },
        { path: 'spots', element: <AppPage title="Spots" /> },
        { path: 'crews', element: <CrewsPage /> },
        { path: 'rooms', element: <RoomsPage /> },
        { path: 'rooms/:id', element: <RoomsPage /> },
        { path: 'connections', element: <InboxPage /> },
        { path: 'people-you-met/:spotId', element: <PeopleYouMetPage /> },
        { path: 'wallet', element: <AppPage title="Wallet" /> },
        { path: 'billing', element: <AppPage title="Billing" /> },
        { path: 'profile', element: <ProfileEditorPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },
  ];
  const router = opts.memory ? createMemoryRouter(routes, { initialEntries: [opts.initial ?? '/'] }) : createBrowserRouter(routes);
  return { Router: () => <RouterProvider router={router} /> };
}
