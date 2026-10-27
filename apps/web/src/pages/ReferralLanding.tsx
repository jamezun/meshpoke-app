// T17.6: /r/:code referral landing — captures the code into the signup link.
import { Link, useParams } from 'react-router-dom';

export function ReferralLanding() {
  const { code = '' } = useParams();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-6">
        <h1 className="text-4xl font-bold">Poke the mesh.</h1>
        <p className="text-lg text-gray-600">A live map for meeting people in real life. Hong Kong.</p>
        {code && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
            You were invited by <b>{code}</b> — your bonus pokes are waiting.
          </p>
        )}
        <a
          href={`meshpoke://signup?ref=${encodeURIComponent(code)}`}
          className="inline-block rounded-xl bg-blue-600 text-white px-6 py-3 font-semibold"
        >
          Get the app
        </a>
        <p className="text-xs text-gray-400">iOS & Android · Sign up with the same device to claim your invite.</p>
        <Link to="/" className="block text-sm text-blue-600 underline">What is MeshPoke?</Link>
      </div>
    </div>
  );
}
