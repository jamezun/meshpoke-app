import { StaticPage, P } from './Static';

export function TermsPage() {
  return (
    <StaticPage title="Terms of Service">
      <P>[Placeholder — final legal text before public launch. Governing law: Hong Kong SAR.]</P>
      <P>Summary of the rules that will apply: 18+, one account per verified phone number, no harassment, no spam, no scraping, hosts are responsible for their spots, MeshPoke handles no event payments.</P>
    </StaticPage>
  );
}

export function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy">
      <P>[Placeholder — final PDPO-compliant text before public launch.]</P>
      <P>In brief: phone numbers are stored encrypted, photos are private by default, location is only read to place you on the map while the app is open, and you can export or delete everything from Settings.</P>
    </StaticPage>
  );
}
