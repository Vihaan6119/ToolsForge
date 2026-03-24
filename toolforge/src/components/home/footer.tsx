import { Github, Instagram, Linkedin } from "lucide-react";
import Link from "next/link";

const links = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Contact", href: "/contact" },
];

const socialLinks = [
  { label: "GitHub", href: "#", icon: Github },
  { label: "LinkedIn", href: "#", icon: Linkedin },
  { label: "Instagram", href: "#", icon: Instagram },
];

export default function Footer() {
  return (
    <footer className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-white">ToolForge</p>
          <p className="mt-1 text-sm text-slate-300">Fast free tools for modern creators.</p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm text-slate-300">
          {links.map((link) => (
            <Link key={link.label} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {socialLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
            >
              <item.icon size={16} />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
