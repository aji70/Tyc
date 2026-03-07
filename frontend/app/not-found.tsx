import Link from "next/link";

/**
 * Minimal global 404 page. Kept server-only so prerender does not pull in
 * client-only modules (Starknet/Dojo/collectibles) that break static generation.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#010F10] text-center px-4">
      <h1 className="text-4xl font-bold text-[#00F0FF] mb-2">Page not found</h1>
      <p className="text-slate-400 mb-6">The page you’re looking for doesn’t exist or was moved.</p>
      <Link
        href="/"
        className="px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-medium transition"
      >
        Go home
      </Link>
    </div>
  );
}
