import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Sparkles className="h-4 w-4 fill-current" />
              </div>
              <span className="font-heading font-bold text-xl text-slate-900">AdSync</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              The AI-powered ad manager built for Nigerian businesses. Scale on Meta & TikTok without the headache.
            </p>
          </div>

          {/* Links Columns */}
          {[
            { title: "Product", links: ["Features", "Pricing", "Case Studies"] },
            { title: "Resources", links: ["Blog", "Community", "Help Center"] },
            { title: "Legal", links: ["Privacy", "Terms", "Security"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-heading font-bold text-slate-900 mb-4">{col.title}</h4>
              <ul className="space-y-3 text-sm text-slate-600">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="hover:text-blue-600 transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>© 2025 AdSync Platforms. Lagos, Nigeria.</p>
          <div className="flex gap-6">
            <Link href="#">Twitter</Link>
            <Link href="#">LinkedIn</Link>
            <Link href="#">Instagram</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}