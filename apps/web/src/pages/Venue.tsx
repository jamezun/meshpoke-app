import { StaticPage, P } from './Static';

export default function VenueLandingPage() {
  return (
    <StaticPage title="MeshPoke for venues">
      <P><b>Claim your venue free.</b> Verify ownership with your BR certificate. Your page, your check-in data, your regulars.</P>
      <P><b>Founding circle.</b> First 25 regulars join a permanent circle — a relationship no coupon platform can take away.</P>
      <P><b>Ladder loyalty.</b> Visits earn real discounts on your terms: 3 visits → 10%, 5 → 15%, 10 → 20% or a perk. No cut taken by MeshPoke.</P>
      <P><b>Drops.</b> Fill a quiet Tuesday with a capacity-limited offer — not a blanket discount.</P>
      <P>Tools plans start at HK$388/mo (founding HK$288 year one) with per-seat pricing from HK$3. <a className="underline" href="/venue/pricing">See pricing →</a></P>
    </StaticPage>
  );
}
