import Link from "next/link";

interface FooterProps {
  maxWidth?: string;
  columns?: boolean;
}

export default function Footer({ maxWidth = "1200px", columns = false }: FooterProps) {
  if (columns) {
    return (
      <footer className="border-t border-white/[0.04]">
        <div className="mx-auto px-6 lg:px-12 py-10" style={{ maxWidth }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-[#5B8DEF] to-[#A78BFA] rounded-md flex items-center justify-center text-white font-bold text-[9px]">TS</div>
                <span className="text-[14px] font-semibold text-[#E8ECF4]">TokenSave</span>
              </div>
              <p className="text-[12px] text-[#3D4654]">AI API cost optimization. Open source.</p>
            </div>
            <FooterColumn title="Product" links={[
              { href: "/playground", label: "Playground" },
              { href: "/dashboard", label: "Dashboard" },
              { href: "/status", label: "Status" },
              { href: "/changelog", label: "Changelog" },
            ]} />
            <FooterColumn title="Developers" links={[
              { href: "/docs", label: "Docs" },
              { href: "/docs/api-reference", label: "API Reference" },
              { href: "/security", label: "Security" },
              { href: "https://github.com/Prathamg042004/tokensave", label: "GitHub" },
            ]} />
            <FooterColumn title="Connect" links={[
              { href: "mailto:prathamg200404@gmail.com", label: "Email" },
              { href: "https://linkedin.com", label: "LinkedIn" },
              { href: "https://twitter.com", label: "Twitter" },
            ]} />
          </div>
          <div className="border-t border-white/[0.04] pt-6 text-center">
            <p className="text-[11px] text-[#3D4654]">© 2026 TokenSave. All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-white/[0.04] mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[#3D4654] text-[12px]" style={{ maxWidth }}>
      <p>© 2026 TokenSave</p>
      <div className="flex gap-4">
        {["Docs", "Security", "Changelog", "Status"].map(l => (
          <Link key={l} href={`/${l.toLowerCase()}`} className="hover:text-[#5A6577] transition-colors">{l}</Link>
        ))}
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-[11px] text-[#5A6577] uppercase tracking-wider font-medium mb-3">{title}</p>
      {links.map(l => (
        <Link key={l.label} href={l.href} className="block text-[12px] text-[#3D4654] hover:text-[#7A8599] transition-colors py-1">{l.label}</Link>
      ))}
    </div>
  );
}