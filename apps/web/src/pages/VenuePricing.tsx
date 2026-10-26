import { StaticPage, P } from './Static';
import { MERCHANT_PRICES, MERCHANT_PER_SEAT_BANDS } from '@meshpoke/shared/constants';

export default function VenuePricingPage() {
  const rows = MERCHANT_PER_SEAT_BANDS.map((b) => [b.maxSeats === Infinity ? '∞' : b.maxSeats, `HK$${b.feeHkd}`]);
  return (
    <StaticPage title="Venue pricing">
      <P><b>Software:</b> Starter free · Growth HK${MERCHANT_PRICES.growth.web.monthly}/mo (founding HK${MERCHANT_PRICES.growth.founding.monthly} year 1) · Pro HK${MERCHANT_PRICES.pro.web.monthly}/mo (founding HK${MERCHANT_PRICES.pro.founding.monthly}). Annual = 2 months free.</P>
      <P><b>Per-seat (Growth/Pro):</b> you pay per verified new-member visit your venue gains through MeshPoke. Flat per seat within monthly bands:</P>
      <table className="w-full text-sm"><tbody>
        <tr className="border-b border-zinc-800"><th className="text-left py-1.5 font-medium">Monthly new-member visits</th><th className="text-left">Per seat</th></tr>
        {rows.map(([upTo, fee], i) => (
          <tr key={i} className="border-b border-zinc-800"><td className="py-1.5">{i === 0 ? `First ${upTo}` : `${Number(rows[i-1][0])}–${upTo}`}</td><td>{fee}</td></tr>
        ))}
      </tbody></table>
      <P>Billing is per calendar month, minimum 30 seats guaranteed. Shadow month: your first month shows every charge, bills nothing.</P>
    </StaticPage>
  );
}
