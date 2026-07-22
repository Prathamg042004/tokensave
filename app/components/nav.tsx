"use client";
import Link from "next/link";

interface NavProps {
  links?: { href: string; label: string }[];
  showAuth?: boolean;
}

const defaultLinks = [
  { href: "/playground", label: "Playground" },
  { href: "/docs", label: "Docs" },
  { href: "/security", label: "Security" },
  { href: "/changelog", label: "Changelog" },
];

export default function Nav({ links = defaultLinks, showAuth = true }: NavProps) {
  return (
    <nav className="sticky top-0 z-50 bg-[#0A0D12]/70 backdrop-blur-2xl border-b border-white/[0.04]">
      <div className="flex justify-between items-center px-6 lg:px-12 py-3.5 max-w-[1400px] mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#5B8DEF]/20 group-hover:shadow-[#5B8DEF]/40 transition-shadow">
            TS
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-[#E8ECF4]">TokenSave</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-[#5A6577] hover:text-white transition-colors relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#5B8DEF] group-hover:w-full transition-all duration-300" />
            </Link>
          ))}
        </div>

        {showAuth && (
          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-[13px] text-[#5A6577] hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/login"
              className="relative px-5 py-2 bg-gradient-to-r from-[#5B8DEF] to-[#A78BFA] text-white rounded-lg text-[13px] font-medium overflow-hidden group shadow-lg shadow-[#5B8DEF]/20 hover:shadow-[#5B8DEF]/40 transition-shadow"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative">Start free</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}