'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import FooterHome from '@/components/layout/FooterHome';

const DONATIONS = [
  { asset: 'Bitcoin', symbol: 'BTC', address: '18d6ybiWceKC3QwAGveMUijVyBMbNvUZmd' },
  { asset: 'Monero', symbol: 'XMR', address: '495CrEJ9p8CPn8YUiU5zv2MCjTuQ167cDR5F1ejrb5RRHzu8vTeUgJjY4kCMirkcP9VRFcBXKPXQN4XJpj35H7YmEqeHpU6' },
  { asset: 'Zcash', symbol: 'ZEC', address: 'u1gjdr3v4tutx7g9jf045sxm35m380q2phsmnhvzs2sygwcxq0w79whuv0k8mksue6fk9k2x5dgt43knkqfjqt2rrf3kr48pkcqqflsux0uzkpkrul2eh4wyql00agn6rkuayw5zuuhf4ehaar8805a2acengl2hrgqzzmsczhlqrxm3l5' },
];

export default function DocumentationView() {
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  const copyAddress = async (symbol: string, address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedSymbol(symbol);
      setTimeout(() => setCopiedSymbol(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#120F0D] text-[#D8D2C7]">
      <Navbar />

      <main className="flex-1 w-full max-w-5xl px-4 sm:px-8 lg:px-12 py-10 sm:py-16">
        <header className="pb-8 border-b border-[#2A231E]">
          <h1 className="text-3xl sm:text-4xl font-serif text-[#FAF7F2] tracking-tight">
            Documentation
          </h1>

          <p className="mt-3 text-base sm:text-lg text-[#A8A196] leading-relaxed max-w-2xl">
            Novrix reads Bitcoin on chain fundamentals and central bank liquidity into a single calm interface. Independent, open source, with zero tracking and zero accounts.
          </p>
        </header>

        <div className="mt-10 space-y-12">
          {/* Section: Workspace Controls */}
          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-serif text-[#FAF7F2]">
              Workspace Controls
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded border border-[#2A231E] bg-[#161210]">
                <div className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                  1Y / ALL Timeframe
                </div>
                <p className="mt-1.5 text-xs text-[#A8A196] leading-relaxed">
                  Toggle between a rolling 1 year window and the complete historical series since Bitcoin origin.
                </p>
              </div>
              <div className="p-4 rounded border border-[#2A231E] bg-[#161210]">
                <div className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                  PRICE Overlay
                </div>
                <p className="mt-1.5 text-xs text-[#A8A196] leading-relaxed">
                  Displays the Bitcoin spot price on a log scale secondary axis aligned with the indicator signal.
                </p>
              </div>
              <div className="p-4 rounded border border-[#2A231E] bg-[#161210]">
                <div className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                  Distribution Zones
                </div>
                <p className="mt-1.5 text-xs text-[#A8A196] leading-relaxed">
                  Color bands marking historical accumulation discounts (green) and elevated cycle risk (red).
                </p>
              </div>
              <div className="p-4 rounded border border-[#2A231E] bg-[#161210]">
                <div className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                  PNG Export &amp; Maximize
                </div>
                <p className="mt-1.5 text-xs text-[#A8A196] leading-relaxed">
                  Capture clean chart screenshots for reports, or expand any panel to focus without distractions.
                </p>
              </div>
            </div>
          </section>

          {/* Section: Data Sources */}
          <section className="space-y-4">
            <h2 className="text-lg sm:text-xl font-serif text-[#FAF7F2]">
              Primary Data Sources
            </h2>
            <div className="border border-[#2A231E] rounded divide-y divide-[#2A231E] bg-[#161210]">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                    BGeometrics
                  </span>
                  <p className="text-xs text-[#A8A196] mt-0.5">Bitcoin on chain valuation, profitability, holder behavior, and miner metrics.</p>
                </div>
                <span
                  className="text-[11px] text-[#8C857C] shrink-0 self-start sm:self-auto"
                  style={{ fontFamily: 'var(--ff-mono)' }}
                >
                  04:00 UTC Daily
                </span>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                    FRED (Federal Reserve)
                  </span>
                  <p className="text-xs text-[#A8A196] mt-0.5">Macroeconomic indicators, Fed funds rate, Treasury yields, and money supply.</p>
                </div>
                <span
                  className="text-[11px] text-[#8C857C] shrink-0 self-start sm:self-auto"
                  style={{ fontFamily: 'var(--ff-mono)' }}
                >
                  Official Releases
                </span>
              </div>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                    Alternative.me
                  </span>
                  <p className="text-xs text-[#A8A196] mt-0.5">Market psychology and Fear &amp; Greed composite sentiment index.</p>
                </div>
                <span
                  className="text-[11px] text-[#8C857C] shrink-0 self-start sm:self-auto"
                  style={{ fontFamily: 'var(--ff-mono)' }}
                >
                  04:00 UTC Daily
                </span>
              </div>
            </div>
          </section>

          {/* Section: Open Source & Infrastructure Support */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-serif text-[#FAF7F2]">
                Support Public Infrastructure
              </h2>
              <p className="text-xs sm:text-sm text-[#A8A196] leading-relaxed">
                Novrix is non commercial with zero advertisements. To help keep edge compute and data feeds running, donations are welcome directly:
              </p>
            </div>

            <div className="space-y-2.5">
              {DONATIONS.map((d) => {
                const isCopied = copiedSymbol === d.symbol;
                return (
                  <div
                    key={d.symbol}
                    className="p-3.5 rounded border border-[#2A231E] bg-[#161210] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#FAF7F2]" style={{ fontFamily: 'var(--ff-mono)' }}>
                          {d.asset}
                        </span>
                        <span
                          className="text-xs text-[#8C857C]"
                          style={{ fontFamily: 'var(--ff-mono)' }}
                        >
                          ({d.symbol})
                        </span>
                      </div>
                      <div
                        className="text-xs text-[#A8A196] break-all select-all font-mono"
                        style={{ fontFamily: 'var(--ff-mono)' }}
                      >
                        {d.address}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyAddress(d.symbol, d.address)}
                      className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center justify-center gap-1.5 ${
                        isCopied
                          ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                          : 'bg-[#1F1916] text-[#FAF7F2] hover:bg-[#2A231E] border border-[#2A231E]'
                      }`}
                      style={{ fontFamily: 'var(--ff-mono)' }}
                    >
                      {isCopied ? '✓ Copied' : 'Copy Address'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick Actions */}
          <div className="pt-6 border-t border-[#2A231E] flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="text-xs text-[#8C857C] hover:text-[#FAF7F2] transition-colors"
              style={{ fontFamily: 'var(--ff-mono)' }}
            >
              ← Return Home
            </Link>
            <Link
              href="/sentiment"
              className="px-4 py-2 text-xs font-semibold text-[#FAF7F2] bg-[#C2344D] hover:bg-[#D43B55] transition-colors rounded"
              style={{ fontFamily: 'var(--ff-mono)' }}
            >
              Open Sentiment Workspace →
            </Link>
          </div>
        </div>
      </main>

      <FooterHome />
    </div>
  );
}
