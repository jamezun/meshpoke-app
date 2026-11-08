import { StaticPage, P } from './Static';

const faqs: [string, string][] = [
  ['What is a poke?', 'A short note to someone you want in your network. If they poke back, you\'re connected — chat and full profiles unlock.'],
  ['Why can\'t I see photos?', 'Photos follow the ladder: sketch in spots until verified check-in, full photos after a mutual connection. Looks are never the entry point.'],
  ['How is this different from dating apps?', 'No swiping, no browsing faces, no pay-to-be-seen. You meet people in person at spots; the app just gets you there.'],
  ['What happens if I no-show?', 'The host records it; it lowers your Show-up Score, which hosts can filter on. Life happens — explain within 48h and the host can void it.'],
  ['Is my phone number visible?', 'Never. It\'s stored encrypted and used only for verification.'],
  ['Is this private? What can people see about me?', 'Browsing is invisible — nobody is told when you look at a spot or a profile. On the map, in listings and in application queues people see only your sketch (industry, one-liner, keywords, trust chips), never your photo. Hosts and members of a spot you join can see that you joined, and people in the same chat room as you can see your main photo (hide it in Settings). During an event spot, members see only your sketch — your full profile unlocks to attendees once the event has ended, or after you both poke.'],
  ['Does MeshPoke handle event payments?', 'No — and by design. Spots set their own price expectations; money changes hands between you and the venue only.'],
];

export default function SupportPage() {
  return (
    <StaticPage title="Support & FAQ">
      {faqs.map(([q, a]) => (
        <details key={q} className="rounded-lg border border-line p-4">
          <summary className="cursor-pointer text-sm font-medium">{q}</summary>
          <p className="mt-2 text-sm text-muted">{a}</p>
        </details>
      ))}
      <P>Still stuck? <a className="underline" href="mailto:support@meshpoke.com">support@meshpoke.com</a></P>
    </StaticPage>
  );
}
