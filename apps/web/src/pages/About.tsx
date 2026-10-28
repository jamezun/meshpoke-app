import { StaticPage, P } from './Static';

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-4 text-xl font-semibold text-fg">{children}</h2>;
}

export default function AboutPage() {
  return (
    <StaticPage title="About MeshPoke">
      <P>
        MeshPoke is a live map for meeting people in real life. Hong Kong first.
        「成個城市，就係你嘅人脈。」— the whole city is your network.
      </P>
      <P>
        We're not a dating app. We're not a dinner app. We're the connective tissue
        between your interests and the people nearby who share them — a mesh you poke.
        Dating apps make you browse faces and swipe. We make it possible to actually
        meet: spots form on the map, you check in with a QR at the venue, and the
        people you sat with become your network.
      </P>

      <H2>Why Hong Kong</H2>
      <P>
        Hong Kong is one of the densest cities on earth — a million potential tennis
        partners, hiking buddies, and co-founders within 15km of you. WhatsApp groups
        and stale event boards are the current best tools. We think a live map beats both.
      </P>

      <H2>What we believe</H2>
      <P>
        <b>Faces are not the entry point.</b> Profiles start as sketches — industry,
        a one-liner, keywords, vibe prompts. Photos unlock with real, verified contact.
      </P>
      <P>
        <b>Showing up is the currency.</b> Your Show-up Score — built from verified
        check-ins, not money — opens doors. Paying makes things faster; it never makes
        people invisible to free users.
      </P>
      <P>
        <b>One price for everyone.</b> Flat, transparent plans. No personalized offers,
        no pay-to-be-seen, no bidding for attention.
      </P>
      <P>
        <b>Money stays out of the meetup.</b> MeshPoke never handles event payments.
        Spots set expectations; the venue takes your money at the door, not us.
      </P>

      <H2>The founding 500</H2>
      <P>
        The first 500 members lock founding pricing forever — HK$88/mo Plus, HK$148/mo Pro.
        Hong Kong has always rewarded the people who show up first. 開台價.
      </P>

      <H2>Built in Hong Kong</H2>
      <P>
        MeshPoke is solo-built in Hong Kong, for Hong Kong. Traditional Chinese comes
        first-class at launch. When the mesh works here, it travels.
      </P>
    </StaticPage>
  );
}
