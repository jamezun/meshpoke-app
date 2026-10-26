import { StaticPage, P } from './Static';

export default function SafetyPage() {
  return (
    <StaticPage title="Safety">
      <P><b>18+ only.</b> Date of birth is verified at signup.</P>
      <P><b>Phone verified.</b> Every account is tied to a verified HK mobile number.</P>
      <P><b>Photo rules.</b> Photos stay off the map. In spots you appear as a sketch until you check in; full photos only appear after a mutual connection.</P>
      <P><b>Verified check-ins only.</b> Presence at a venue is proven by GPS + QR at the door — never self-reported.</P>
      <P><b>Scam defenses.</b> Notes are text-only. Links never auto-render. Handles get a pattern check. One tap to report or block. When in doubt, check <a className="underline" href="https://cyberdefender.hk/en-us/scameter/" target="_blank" rel="noreferrer">Scameter</a> or call 999.</P>
      <P><b>Moderation.</b> Reports trigger review; repeat offenders lose score, then account. Host powers are logged and reviewable.</P>
    </StaticPage>
  );
}
