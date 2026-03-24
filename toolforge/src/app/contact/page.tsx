"use client";

import Navbar from "@/components/ui/navbar";
import Link from "next/link";
import { FormEvent, useState } from "react";

const CONTACT_EMAIL = "toolsforgesupport@gmail.com";
const DESIGNER_NAME = "Vihaan Virendra Ghelani";
const DESIGNER_EMAIL = "toolsforgesupport@gmail.com";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const canSubmit = Boolean(name.trim() && email.trim() && message.trim());

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const subject = encodeURIComponent(`ToolForge inquiry from ${name.trim()}`);
    const body = encodeURIComponent(
      `Name: ${name.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message.trim()}`,
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="relative pb-16">
      <Navbar />
      <main className="mx-auto w-[min(900px,92vw)] space-y-8">
        {/* Header Section */}
        <section className="rounded-3xl border border-white/12 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Get in Touch</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Contact ToolsForge</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
            Have questions about our tools? Need support? Want to suggest a feature? We'd love to hear from you. 
            Reach out to our team and we'll get back to you as soon as possible.
          </p>
        </section>

        {/* Contact Form & Quick Contact Info */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Contact Form */}
          <section className="rounded-2xl border border-white/12 bg-slate-900/70 p-5 sm:p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-white">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm text-slate-300">Your Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
                  placeholder="John Doe"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-slate-300">Email Address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-slate-300">Message</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="min-h-40 w-full rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none ring-cyan-300/60 transition focus:ring-2"
                  placeholder="Tell us how we can help..."
                />
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-5 py-2.5 text-sm font-semibold text-slate-900 transition enabled:hover:-translate-y-0.5 enabled:shadow-lg enabled:shadow-cyan-500/50 disabled:opacity-50"
                >
                  Send Message
                </button>
              </div>
            </form>
          </section>

          {/* Sidebar - Quick Info */}
          <section className="space-y-4">
            {/* Email Card */}
            <div className="rounded-2xl border border-white/12 bg-slate-900/70 p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase text-cyan-200">Email</h3>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="block rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white hover:bg-white/10 transition break-all"
              >
                {CONTACT_EMAIL}
              </a>
            </div>

            {/* Designer Info Card */}
            <div className="rounded-2xl border border-white/12 bg-linear-to-br from-cyan-500/10 to-blue-500/10 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase text-cyan-200">Designed By</h3>
              <div className="space-y-2">
                <p className="text-sm text-white font-medium">{DESIGNER_NAME}</p>
                <a
                  href={`mailto:${DESIGNER_EMAIL}`}
                  className="inline-block rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-500/30 transition"
                >
                  Contact Designer
                </a>
              </div>
            </div>

            {/* Response Time Card */}
            <div className="rounded-2xl border border-white/12 bg-slate-900/70 p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase text-cyan-200">Response Time</h3>
              <p className="text-sm text-slate-300">We typically respond within 24-48 hours</p>
            </div>
          </section>
        </div>

        {/* About Us Section */}
        <section className="rounded-3xl border border-white/12 bg-linear-to-br from-blue-500/10 to-cyan-500/10 p-6 shadow-xl shadow-cyan-950/20 backdrop-blur sm:p-8">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">About ToolsForge</h2>
          
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-base font-semibold text-cyan-300">Mission</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                ToolsForge is dedicated to providing free, open-source tools for document and media manipulation. 
                We believe that powerful productivity tools should be accessible to everyone, without hidden costs or subscriptions.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-base font-semibold text-cyan-300">What We Offer</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                From PDF editing and image processing to text conversion and QR code generation, ToolsForge provides 
                a comprehensive suite of productivity tools. All tools are powered by cutting-edge open-source libraries.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-base font-semibold text-cyan-300">Technology</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Built with Next.js, React, and TypeScript. Powered by pdf.js, pdf-lib, Tesseract.js, and other 
                open-source technologies. Designed to be fast, reliable, and completely private.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-base font-semibold text-cyan-300">Privacy First</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Your files never leave your browser. All processing happens client-side. No tracking, no analytics, 
                no data collection. Complete privacy and control over your documents.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white/5 border border-white/20 p-4">
            <p className="text-sm text-slate-400">
              <span className="font-semibold text-cyan-300">Questions?</span> Check out our documentation, 
              browse the FAQ, or contact us directly. We're here to help make your workflow smoother.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="rounded-3xl border border-white/12 bg-white/5 p-6 text-center sm:p-8">
          <h2 className="text-2xl font-semibold text-white">Ready to Get Started?</h2>
          <p className="mt-2 text-slate-300">Explore our tools and start creating, editing, and converting documents with ease.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-xl bg-linear-to-r from-cyan-300 to-blue-300 px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:shadow-lg hover:shadow-cyan-500/50 hover:-translate-y-0.5"
            >
              Explore Tools
            </Link>
            <Link
              href="/#pricing"
              className="rounded-xl border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              View Pricing
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
