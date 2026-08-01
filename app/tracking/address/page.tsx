'use client';

import Navbar from '@/components/layout/Navbar';
import AuthGuard from '@/components/layout/AuthGuard';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface AddressInfo {
  address: string;
  label: string;
  entity: string;
  blockchain: string;
  tags: string;
  logo: string;
}

interface AddressStats {
  total_sent: number;
  total_received: number;
  net_flow: number;
  tx_count: number;
  first_seen: string;
  last_seen: string;
}

interface TokenBreakdown {
  token: string;
  blockchain: string;
  volume: number;
  cnt: number;
}

interface Transaction {
  id: number;
  signature: string;
  amount_usd: number;
  amount_native: number;
  flow_type: string;
  sender: string;
  receiver: string;
  sender_label: string;
  receiver_label: string;
  timestamp: string;
  blockchain: string;
  token: string;
  direction: 'sent' | 'received';
}

interface ApiResponse {
  success: boolean;
  address: AddressInfo;
  stats: AddressStats;
  tokens: TokenBreakdown[];
  transactions: Transaction[];
}

/* ═══════════════════════════════════════════════════════════
   CHAIN CONFIG
   ═══════════════════════════════════════════════════════════ */

const CHAIN_CONFIG: Record<string, { icon: string; color: string; explorer: string }> = {
  Bitcoin: { icon: '₿', color: '#F7931A', explorer: 'https://mempool.space' },
  Ethereum: { icon: 'Ξ', color: '#627EEA', explorer: 'https://etherscan.io' },
  Solana: { icon: '◎', color: '#00F0FF', explorer: 'https://solscan.io' },
  Tron: { icon: '⟁', color: '#FF0013', explorer: 'https://tronscan.org' },
  Sui: { icon: '◐', color: '#4DA2FF', explorer: 'https://suiscan.xyz' },
  Sei: { icon: '◑', color: '#9B1C2E', explorer: 'https://www.seiscan.app' },
};

const getExplorerAddrUrl = (chain: string, addr: string) => {
  if (chain === 'Bitcoin') return `https://mempool.space/address/${addr}`;
  if (chain === 'Ethereum') return `https://etherscan.io/address/${addr}`;
  if (chain === 'Tron') return `https://tronscan.org/#/address/${addr}`;
  if (chain === 'Sui') return `https://suiscan.xyz/mainnet/account/${addr}`;
  if (chain === 'Sei') return `https://www.seiscan.app/accounts/${addr}`;
  return `https://solscan.io/account/${addr}`;
};

const getExplorerTxUrl = (chain: string, sig: string) => {
  if (chain === 'Bitcoin') return `https://mempool.space/tx/${sig}`;
  if (chain === 'Ethereum') return `https://etherscan.io/tx/${sig}`;
  if (chain === 'Tron') return `https://tronscan.org/#/transaction/${sig}`;
  if (chain === 'Sui') return `https://suiscan.xyz/mainnet/tx/${sig}`;
  if (chain === 'Sei') return `https://www.seiscan.app/transactions/${sig}`;
  return `https://solscan.io/tx/${sig}`;
};

/* ═══════════════════════════════════════════════════════════
   INNER COMPONENT (uses useSearchParams)
   ═══════════════════════════════════════════════════════════ */

function AddressDetailInner() {
  const searchParams = useSearchParams();
  const addr = searchParams.get('addr') || '';

  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAddress = useCallback(async () => {
    if (!addr) { setError('No address provided'); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/address/?address=${encodeURIComponent(addr)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json() as ApiResponse;
      if (json.success) {
        setData(json);
      } else {
        setError('Address not found');
      }
    } catch {
      setError('Failed to load address data');
    } finally {
      setIsLoading(false);
    }
  }, [addr]);

  useEffect(() => { queueMicrotask(() => { void fetchAddress(); }); }, [fetchAddress]);

  // Frozen at mount so age rows are deterministic for a given render pass.
  const [nowMs] = useState(() => Date.now());

  const formatUSD = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };

  const formatAge = (ts: string) => {
    if (!ts) return '—';
    const normalized = ts.includes('Z') || ts.includes('+') ? ts : ts + 'Z';
    const diff = nowMs - new Date(normalized).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'NOW';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  const shortenAddr = (a: string) => a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a;
  const shortenSig = (s: string) => s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;

  const chainColor = (chain: string) => CHAIN_CONFIG[chain]?.color || '#00F0FF';
  const chainIcon = (chain: string) => CHAIN_CONFIG[chain]?.icon || '◈';

  const addrInfo = data?.address;
  const stats = data?.stats;
  const tokens = data?.tokens || [];
  const txs = data?.transactions || [];

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B]">
      <Navbar />

      <style jsx global>{`
        @keyframes gradient-x { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .stat-glow { position: relative; }
        .stat-glow::after { content: ''; position: absolute; inset: 0; border-radius: inherit; opacity: 0; transition: opacity 0.3s; background: radial-gradient(circle at center, var(--glow-color) 0%, transparent 70%); pointer-events: none; }
        .stat-glow:hover::after { opacity: 0.05; }
      `}</style>

      <main className="flex-1 px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-6 relative z-10">
        <div className="max-w-[1600px] mx-auto">

          {/* ══ Back navigation ══ */}
          <Link href="/tracking"
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[10px] font-mono font-bold text-[#555] hover:text-[#00F0FF] transition-all rounded-lg tracking-wider"
            style={{ border: '1px solid #1A1A1A', background: 'rgba(255,255,255,0.01)' }}>
            <span>←</span>
            <span>BACK TO TRACKING</span>
          </Link>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="w-12 h-12 rounded-full border-2 border-[#00F0FF] border-t-transparent animate-spin mb-4" />
              <span className="text-[#555] font-mono text-xs tracking-wider">RESOLVING ADDRESS...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32">
              <div className="text-4xl mb-4 opacity-20">⌀</div>
              <span className="text-[#555] font-mono text-sm">{error}</span>
              <span className="text-[#333] font-mono text-xs mt-2">
                No whale transactions found for this address
              </span>
            </div>
          ) : (
            <>
              {/* ══════ ADDRESS HEADER ══════ */}
              <div className="mb-8 p-6 rounded-xl relative overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(15,15,18,0.95), rgba(10,10,13,0.98))',
                  border: '1px solid rgba(0,240,255,0.08)',
                }}>
                {/* Decorative gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: 'linear-gradient(90deg, transparent, #00F0FF, #C2344D, transparent)' }} />
                
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Left: Address info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {addrInfo?.blockchain && (
                        <span className="text-2xl" style={{ 
                          color: chainColor(addrInfo.blockchain),
                          filter: `drop-shadow(0 0 8px ${chainColor(addrInfo.blockchain)}50)`,
                        }}>
                          {chainIcon(addrInfo.blockchain)}
                        </span>
                      )}
                      <div>
                        {addrInfo?.label ? (
                          <h1 className="text-xl sm:text-2xl font-mono font-black text-white">
                            {addrInfo.label}
                          </h1>
                        ) : (
                          <h1 className="text-lg font-mono font-bold text-[#666]">Unknown Address</h1>
                        )}
                        {addrInfo?.entity && (
                          <span className="text-[11px] font-mono tracking-wider"
                            style={{ color: chainColor(addrInfo.blockchain || '') }}>
                            {addrInfo.entity}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Full address + copy */}
                    <div className="flex items-center gap-2 mb-4">
                      <code className="text-[11px] sm:text-xs font-mono text-[#666] break-all select-all">
                        {addr}
                      </code>
                      {addrInfo?.blockchain && (
                        <a href={getExplorerAddrUrl(addrInfo.blockchain, addr)}
                          target="_blank" rel="noopener noreferrer"
                          className="text-[9px] font-mono font-bold px-2 py-1 rounded transition-all hover:opacity-80"
                          style={{ 
                            color: chainColor(addrInfo.blockchain),
                            border: `1px solid ${chainColor(addrInfo.blockchain)}30`,
                            background: `${chainColor(addrInfo.blockchain)}08`,
                          }}>
                          EXPLORER ↗
                        </a>
                      )}
                    </div>

                    {/* Tags */}
                    {addrInfo?.tags && (
                      <div className="flex flex-wrap gap-2">
                        {addrInfo.tags.split(',').map(tag => (
                          <span key={tag} className="px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider rounded-full"
                            style={{ 
                              color: '#00F0FF',
                              background: 'rgba(0,240,255,0.06)',
                              border: '1px solid rgba(0,240,255,0.12)',
                            }}>
                            {tag.trim().toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Quick stats */}
                  <div className="flex flex-col gap-2 lg:text-right">
                    <div className="text-[9px] font-mono text-[#555] tracking-wider">ACTIVITY OVERVIEW</div>
                    <div className="text-2xl font-mono font-black text-white tabular-nums">
                      {stats?.tx_count || 0} <span className="text-sm text-[#555]">TXS</span>
                    </div>
                    <div className="text-[10px] font-mono text-[#444]">
                      {stats?.first_seen ? `First seen: ${new Date(stats.first_seen).toLocaleDateString()}` : 'No activity'}
                    </div>
                    <div className="text-[10px] font-mono text-[#444]">
                      {stats?.last_seen ? `Last seen: ${formatAge(stats.last_seen)}` : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* ══════ STATS CARDS ══════ */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                {[
                  { label: 'TOTAL SENT', value: formatUSD(stats?.total_sent || 0), color: '#C2344D', icon: '▲' },
                  { label: 'TOTAL RECEIVED', value: formatUSD(stats?.total_received || 0), color: '#00F0FF', icon: '▼' },
                  { label: 'NET FLOW', value: `${(stats?.net_flow || 0) >= 0 ? '+' : ''}${formatUSD(Math.abs(stats?.net_flow || 0))}`, color: (stats?.net_flow || 0) >= 0 ? '#00FF88' : '#FF4444', icon: (stats?.net_flow || 0) >= 0 ? '↑' : '↓' },
                  { label: 'TOTAL VOLUME', value: formatUSD((stats?.total_sent || 0) + (stats?.total_received || 0)), color: '#fff', icon: '◇' },
                  { label: 'TRANSACTIONS', value: String(stats?.tx_count || 0), color: '#00F0FF', icon: '⟐' },
                ].map(s => (
                  <div key={s.label} className="stat-glow p-4 rounded-lg"
                    style={{ 
                      '--glow-color': s.color,
                      background: 'linear-gradient(135deg, rgba(15,15,17,0.9), rgba(10,10,12,0.95))',
                      border: '1px solid #1A1A1C',
                    } as React.CSSProperties}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[8px] font-mono text-[#555] tracking-[0.15em]">{s.label}</span>
                      <span className="text-xs opacity-30" style={{ color: s.color }}>{s.icon}</span>
                    </div>
                    <div className="text-base sm:text-lg font-mono font-black tabular-nums" style={{ color: s.color }}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* ══════ TOKEN BREAKDOWN ══════ */}
              {tokens.length > 0 && (
                <div className="mb-8 p-5 rounded-xl"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(15,15,18,0.9), rgba(10,10,13,0.95))',
                    border: '1px solid #1A1A1C',
                  }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-mono text-[#00F0FF] font-bold tracking-wider">▸ TOKEN EXPOSURE</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {tokens.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg transition-all hover:border-[rgba(0,240,255,0.15)]"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #151518' }}>
                        <span className="text-lg" style={{ color: chainColor(t.blockchain) }}>
                          {chainIcon(t.blockchain)}
                        </span>
                        <div>
                          <div className="text-[11px] font-mono font-bold text-white">{t.token}</div>
                          <div className="text-[9px] font-mono text-[#555]">
                            {formatUSD(t.volume)} · {t.cnt} txs
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════ TRANSACTION HISTORY ══════ */}
              <div className="rounded-xl overflow-hidden"
                style={{ 
                  background: '#0A0A0C',
                  border: '1px solid rgba(0,240,255,0.06)',
                }}>
                <div className="flex items-center justify-between px-5 py-3"
                  style={{ 
                    borderBottom: '1px solid rgba(0,240,255,0.06)',
                    background: 'linear-gradient(180deg, rgba(0,240,255,0.02), transparent)',
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-[#00F0FF] font-bold tracking-wider">▸ TRANSACTION HISTORY</span>
                    <span className="text-[10px] font-mono text-[#555]">{txs.length} txs</span>
                  </div>
                </div>

                {txs.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-2xl mb-2 opacity-20">⌀</div>
                    <span className="text-[#444] font-mono text-xs">No whale transactions found for this address</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                      <thead className="sticky top-0 z-10" style={{ background: '#0A0A0C' }}>
                        <tr style={{ borderBottom: '0.5px solid rgba(0,240,255,0.06)' }}>
                          {['DIR', 'CHAIN', 'TOKEN', 'AMOUNT', 'COUNTERPARTY', 'AGE', 'TX'].map(col => (
                            <th key={col} className="px-3 py-2.5 text-left text-[8px] font-mono tracking-widest"
                              style={{ color: '#00F0FF', opacity: 0.4 }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {txs.map(tx => {
                          const isSent = tx.direction === 'sent';
                          const cc = chainColor(tx.blockchain);
                          const counterparty = isSent ? tx.receiver : tx.sender;
                          const counterpartyLabel = isSent ? tx.receiver_label : tx.sender_label;

                          return (
                            <tr key={tx.id}
                              className="transition-colors hover:bg-[rgba(0,240,255,0.02)]"
                              style={{ borderBottom: '0.5px solid rgba(0,240,255,0.03)' }}>
                              {/* Direction */}
                              <td className="px-3 py-2.5">
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                                  style={{
                                    color: isSent ? '#C2344D' : '#00F0FF',
                                    background: isSent ? 'rgba(194,52,77,0.1)' : 'rgba(0,240,255,0.08)',
                                    border: `0.5px solid ${isSent ? 'rgba(194,52,77,0.2)' : 'rgba(0,240,255,0.15)'}`,
                                  }}>
                                  {isSent ? 'SENT' : 'RECV'}
                                </span>
                              </td>
                              {/* Chain */}
                              <td className="px-3 py-2.5">
                                <span className="text-sm" style={{ color: cc }}>{chainIcon(tx.blockchain)}</span>
                              </td>
                              {/* Token */}
                              <td className="px-3 py-2.5">
                                <span className="text-[10px] font-mono font-bold" style={{ color: cc }}>
                                  {tx.token}
                                </span>
                              </td>
                              {/* Amount */}
                              <td className="px-3 py-2.5">
                                <span className="text-[11px] font-mono font-bold text-white tabular-nums">
                                  {formatUSD(tx.amount_usd)}
                                </span>
                                {tx.amount_native > 0 && (
                                  <span className="text-[9px] font-mono text-[#444] ml-2">
                                    {tx.amount_native.toLocaleString('en-US', { maximumFractionDigits: 2 })} {tx.token}
                                  </span>
                                )}
                              </td>
                              {/* Counterparty */}
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col">
                                  {counterpartyLabel && (
                                    <span className="text-[8px] font-mono font-bold" style={{ color: cc, opacity: 0.7 }}>
                                      {counterpartyLabel}
                                    </span>
                                  )}
                                  <Link href={`/tracking/address?addr=${encodeURIComponent(counterparty)}`}
                                    className="text-[10px] font-mono text-[#555] hover:text-[#00F0FF] transition-colors">
                                    {shortenAddr(counterparty)}
                                  </Link>
                                </div>
                              </td>
                              {/* Age */}
                              <td className="px-3 py-2.5">
                                <span className="text-[10px] font-mono text-[#444] tabular-nums">
                                  {formatAge(tx.timestamp)}
                                </span>
                              </td>
                              {/* TX Hash */}
                              <td className="px-3 py-2.5">
                                <a href={getExplorerTxUrl(tx.blockchain, tx.signature)}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-[10px] font-mono hover:underline transition-colors"
                                  style={{ color: cc }}>
                                  {shortenSig(tx.signature)}
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ══ Bottom nav ══ */}
              <div className="text-center mt-8">
                <Link href="/tracking"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-[10px] font-mono font-bold text-[#444] hover:text-[#00F0FF] transition-all rounded-lg tracking-wider"
                  style={{ border: '1px solid #1A1A1A', background: 'rgba(255,255,255,0.01)' }}>
                  <span>←</span>
                  <span>BACK TO TRACKING</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE EXPORT (Suspense wrapper for useSearchParams)
   ═══════════════════════════════════════════════════════════ */

export default function AddressPage() {
  return (
    <AuthGuard>
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#00F0FF] border-t-transparent animate-spin mb-4" />
          <span className="text-[#555] font-mono text-xs tracking-wider">LOADING...</span>
        </div>
      </div>
    }>
      <AddressDetailInner />
    </Suspense>
    </AuthGuard>
  );
}
