'use client';

import TerminalModulePageShell from '@/components/terminal/TerminalModulePageShell';
import FooterTerminal from '@/components/terminal/FooterTerminal';
import DesktopGate from '@/components/layout/DesktopGate';
import BootSequence from '@/components/layout/BootSequence';
import AuthGuard from '@/components/layout/AuthGuard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { fetchCached } from '@/lib/bootCache';
import { prefetchTerminalModule } from '@/lib/terminalModulePrefetch';
import TrackingDataPanels from './TrackingDataPanels';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface WhaleTransaction {
  id: number;
  signature: string;
  amount_usd: number;
  amount_native: number;
  flow_type: 'Exchange Inflow' | 'Exchange Outflow' | 'Exchange Transfer' | 'Inflow' | 'Outflow' | 'Transfer' | 'Whale Transfer' | 'Miner Movement' | 'Mint' | 'Burn' | 'Self';
  sender: string;
  receiver: string;
  sender_label: string;
  receiver_label: string;
  timestamp: string;
  blockchain: string;
  token: string;
  // New fields from v2 API
  source?: string;
  is_pending?: number;
  transaction_type?: string;
  token_name?: string;
  block_height?: number;
}

interface Stats {
  total_volume: number;
  total_txs: number;
  largest_tx: number;
  inflow_volume: number;
  outflow_volume: number;
  by_chain: Record<string, { count: number; volume: number }>;
  by_token: Record<string, number>;
}

interface Pagination {
  offset: number;
  limit: number;
  returned: number;
  total: number;
  hasMore: boolean;
}

interface WindowStats {
  total_volume: number;
  total_txs: number;
  largest_tx: number;
  inflow_volume: number;
  outflow_volume: number;
  net_flow: number;
  by_chain: Record<string, { count: number; volume: number }>;
  by_token: Record<string, number>;
}

interface ApiResponse {
  success: boolean;
  data: WhaleTransaction[];
  transactions?: WhaleTransaction[];
  stats: Stats;
  pagination: Pagination;
  data_freshness_seconds?: number;
  last_updated?: string;
  chains_active?: string[];
  window_24h?: WindowStats;
  window_7d?: WindowStats;
  prev_24h?: WindowStats;
  prev_7d?: WindowStats;
}

interface SearchResult {
  address: string;
  label: string;
  entity: string;
  blockchain: string;
  tags: string;
}

interface EntityProfile {
  entity: string;
  chains: string[];
  address_count: number;
  tags: string;
  tx_count: number;
  total_volume: number;
  last_active: string;
}

interface EntityDetail {
  name: string;
  address_count: number;
  blockchains: string[];
  tags: string;
}

interface EntityDetailResponse {
  success: boolean;
  entity: EntityDetail;
  addresses: { address: string; label: string; entity: string; blockchain: string; tags: string }[];
  stats: {
    total_received: number;
    total_sent: number;
    net_flow: number;
    tx_count: number;
    last_active: string;
  };
  tokens: { token: string; blockchain: string; volume: number; cnt: number }[];
  recent_transactions: WhaleTransaction[];
}

/* ── Holdings types ── */
interface HoldingsByChain {
  token: string;
  balance: number;
  balance_usd: number;
  price: number;
  addresses: { address: string; label: string; balance: number; balance_usd: number }[];
}

interface TokenHolding {
  address: string;
  blockchain: string;
  token_symbol: string;
  token_name: string;
  balance: number;
  balance_usd: number;
  price: number;
  updated_at: string;
}

interface HoldingsTx {
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
  action: 'Bought / Received' | 'Sold / Sent' | 'Transfer';
}

interface EntityHoldingsDetail {
  success: boolean;
  entity: string;
  category: string;
  description: string;
  portfolio: { total_usd: number; native_usd: number; token_usd: number };
  holdings_by_chain: Record<string, HoldingsByChain>;
  token_holdings: TokenHolding[];
  recent_transactions: HoldingsTx[];
  updated_at: string;
}

interface EntityLeaderboardRow {
  entity: string;
  category: string;
  description: string;
  total_usd: number;
  native_usd: number;
  token_usd: number;
  address_count: number;
  chains: string[];
  tokens: string[];
  last_updated: string;
}

interface HoldingsLeaderboard {
  success: boolean;
  entities: EntityLeaderboardRow[];
  count: number;
  stats: {
    entities_tracked: number;
    addresses_tracked: number;
    total_value_tracked: number;
    last_scan: string;
  };
}

/* ═══════════════════════════════════════════════════════════
   ENTITY REGISTRY
   ═══════════════════════════════════════════════════════════ */

interface Entity {
  name: string;
  category: 'ETF' | 'Exchange' | 'Corporate' | 'Government' | 'DeFi' | 'Whale' | 'MM' | 'Fund' | 'Miner' | 'VC' | 'Stablecoin';
  addresses: Record<string, string[]>;
  tags: string[];
}

const ENTITY_REGISTRY: Entity[] = [
  // ── FUNDS & ETFS ──
  { name: 'BlackRock', category: 'Fund', addresses: {}, tags: ['ETF', 'Institutional'] },
  { name: 'Fidelity', category: 'Fund', addresses: {
    Bitcoin: ['bc1q3kuvgjluhswl7lmqzsxvnkr7g2gk3sjdfkjuac']
  }, tags: ['ETF'] },
  { name: 'Grayscale', category: 'Fund', addresses: {
    Bitcoin: ['37XuVSEpWW4trkfmvWzegTHQt7BdktSKUs'],
    Ethereum: ['0x1b3cb81e51011b549d78bf720b0d924ac763a7c2']
  }, tags: ['ETF', 'Trust'] },
  { name: 'ARK Invest', category: 'Fund', addresses: {
    Bitcoin: ['3QW46SLTrb2DkiBponjPQLZAQAcx3BXFKQ']
  }, tags: ['ETF'] },
  { name: 'Bitwise', category: 'Fund', addresses: {
    Bitcoin: ['bc1qkkfcnafkf7w0yjz4e6kpx6pfqehafxpgrfz3kx']
  }, tags: ['ETF'] },
  { name: 'VanEck', category: 'Fund', addresses: {
    Bitcoin: ['bc1q8zn30knrvp3n4gdnfpnpxq5x6h3z88q3v2xqh0']
  }, tags: ['ETF'] },
  { name: 'Invesco', category: 'Fund', addresses: {
    Bitcoin: ['bc1qe7n32d5k6h754v4j3wkxr8lq7fnqdjk6y79jzk']
  }, tags: ['ETF'] },
  { name: 'Franklin', category: 'Fund', addresses: {
    Bitcoin: ['bc1q9t2hla7gvu8p3j59kq2nh74sa45p8c7faj8m53']
  }, tags: ['ETF'] },
  { name: 'WisdomTree', category: 'Fund', addresses: {
    Bitcoin: ['bc1qlhq5f6k5z2vw8rxvaz9e3f3q2gh9m2j9hpk0d4']
  }, tags: ['ETF'] },
  { name: 'Hashdex', category: 'Fund', addresses: {
    Bitcoin: ['1Ccra2HBPJnVh4ywPMNZxnwiqk5hPjoFEp']
  }, tags: ['ETF'] },
  { name: 'Valkyrie', category: 'Fund', addresses: {
    Bitcoin: ['bc1qjkuqsq0k3eqy03gfq4lv0e08r3pa7tm82a72p']
  }, tags: ['ETF'] },
  { name: 'PIMCO', category: 'Fund', addresses: {}, tags: ['Institutional'] },
  { name: 'Global X', category: 'Fund', addresses: {}, tags: ['ETF'] },
  { name: 'Vanguard', category: 'Fund', addresses: {}, tags: ['Institutional'] },
  { name: 'State Street', category: 'Fund', addresses: {}, tags: ['Custodian'] },
  { name: 'Northern Trust', category: 'Fund', addresses: {}, tags: ['Custodian'] },
  { name: 'BNY Mellon', category: 'Fund', addresses: {}, tags: ['Custodian'] },
  { name: 'Galaxy Digital', category: 'Fund', addresses: {
    Ethereum: ['0x7758e507850da48cd47df1fb5f875c23e3340c50']
  }, tags: ['Fund', 'MM'] },

  // ── EXCHANGES ──
  { name: 'Binance', category: 'Exchange', addresses: {
    Bitcoin: ['bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', '1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', '3M219KR5vEneNb47ewrPfWyb5jQ2DjxRP6', '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo'],
    Ethereum: ['0x28c6c06298d514db089934071355e5743bf21d60', '0x21a31ee1afc51d94c2efccaa2092ad1028285549', '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', '0xf977814e90da44bfa03b6295a0616a897441acec', '0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503'],
    Solana: ['5tzFkiKscjHsFKRxMf8VdL4fNkxs3H7fUYy7g7bJgqCL', '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'],
    Tron: ['TLM8Krcm1SeuD3B6brVFdo3ppfrVg1GQLM', 'TVGDhBRjPKJR5yBpcjAyLEFkuLh8UQPHJE', 'TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6']
  }, tags: ['CEX', 'Top Tier'] },
  { name: 'Coinbase', category: 'Exchange', addresses: {
    Bitcoin: ['bc1q7cyrfmck2ffu2ud3rn5l5a8yv6f0chkp0zpemf', '3Cbq7aT1tY8kMxWLbitaG7yT6bPbKChq64'],
    Ethereum: ['0x503828976d22510aad0201ac7ec88293211d23da', '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43', '0x71660c4005ba85c37ccec55d0c4493e66fe775d3', '0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740', '0x77134cbc06cb00b66f4c7e623d5fdbf6777635ec'],
    Solana: ['2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S', 'H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS']
  }, tags: ['CEX', 'Top Tier', 'Public'] },
  { name: 'Kraken', category: 'Exchange', addresses: {
    Bitcoin: ['bc1qr4dl5wa7kl8yu792dceg9z5knl2gkn220lk7a9', '12tkqhBN5aGz2TRWbXYHYFw6yH6LYezsau'],
    Ethereum: ['0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0', '0x2910543af39aba0cd09dbb2d50200b3e800a63d2'],
    Solana: ['HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH', 'FWznbcNXWQuHTawe9RxvQ2LdCEVzKMoXGBEMN4hGbMTf'],
    Tron: ['TWd4WrZ9wn84f5x1hZhL4DHvk738ns5jwb']
  }, tags: ['CEX'] },
  { name: 'OKX', category: 'Exchange', addresses: {
    Bitcoin: ['bc1qjl8uwezzlech723lpnyuza0h2cdkvxvh54v3dn'],
    Ethereum: ['0x6cc5f688a315f3dc28a7781717a9a798a59fda7b', '0x98ec059dc3adfbdd63429227d09cb5b810f7e667'],
    Solana: ['3yFwqXBfZY4jBVUafQ1YEXw189y2dN3V5KQq9uzBDy1E', '5VCwKtCXgCDuQKdc8FVVbPSQnSJCAUBDbhHrf4bLgSAT'],
    Tron: ['TNaRAoLUyYEV2uF7GUrzSjRQTU8v5ZJ5VR']
  }, tags: ['CEX'] },
  { name: 'Bybit', category: 'Exchange', addresses: {
    Bitcoin: ['bc1qfu6su8gzfe8vrp0f0k57kfk0n30j5m47vl4z63', '1LQoWist8KkaUXSPKZHNvEyfrEkPHz5CdF'],
    Ethereum: ['0x4e5b2e1dc63f6b91cb6cd759936495434c7e972f', '0x1db92e2eebc8e0c075a02bea49a2935bcd2dfcf4', '0xa69e1ff623e6b8c56ef8ab97bcd9bdb4492aaa2c'],
    Solana: ['Bybit2vBJGhPF5xZC82yS8xpiKr4n3LUvTxr1YDikGfP', 'DWLr9sKXaGMTVVsMD5KBwFQz17GVe53A32kXz5K6EFso'],
    Tron: ['TAzLoc1fw7xDEzMQY54c7BXrHED5FBBz3F']
  }, tags: ['CEX'] },
  { name: 'HTX', category: 'Exchange', addresses: {
    Bitcoin: ['1JqDybm2nWTENrHvMyafbSXXtTk5Uv5QAn', '1LAnF8h3qMGx3TSwNUHVneBZUEpwE4gu3D'],
    Ethereum: ['0x46340b20830761efd32832a74d7169b29feb9758', '0x5c985e89dde482efe97ea9f1950ad149eb73829b'],
    Solana: ['AobVSwdW9BbpMdJvTqeCN4hPAmh4rHm7vwLnQ5ATbo3s'],
    Tron: ['TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe']
  }, tags: ['CEX'] },
  { name: 'Crypto.com', category: 'Exchange', addresses: {
    Ethereum: ['0x72a53cdbbcc1b9efa39c834a540550e23463aacb', '0x0a59649758aa4d66e25f08dd01271e891fe52199', '0xcffad3200574698b78f32232aa9d63eabd290703']
  }, tags: ['CEX'] },
  { name: 'Gate.io', category: 'Exchange', addresses: {
    Bitcoin: ['3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb'],
    Ethereum: ['0x0d0707963952f2fba59dd06f2b425ace40b492fe', '0xd793281b323cf0dd9ef37cac22cd3cd9cf7292c3'],
    Solana: ['BmFdpraQhkiDQE6SnfG5omcA1VwzqfXrwtNYBwWTymy6'],
    Tron: ['TDqSquXBgUCLYvKf1eejU9ySXdNnN6yKfU']
  }, tags: ['CEX'] },
  { name: 'Bitfinex', category: 'Exchange', addresses: {
    Bitcoin: ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97'],
    Ethereum: ['0x1151314c646ce4e0efd76d1af4760ae66a9fe30f', '0x876eabf441b2ee5b5b0554fd502a8e0600950cfa', '0xc61b9bb3a7a0767e3179713f3a5c7a9aedce193c', '0x742d35cc6634c0532925a3b844bc9e7595f2bd1e'],
    Tron: ['TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9']
  }, tags: ['CEX'] },
  { name: 'KuCoin', category: 'Exchange', addresses: {
    Bitcoin: ['1Mn8cWoFSvPxKRi8dPEgFjKsuTKSEHF8Fp'],
    Ethereum: ['0x2b5634c42055806a59e9107ed44d43c426e58258', '0xd6216fc19db775df9774a6e33526131da7d19a2c'],
    Solana: ['2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm'],
    Tron: ['TAUN6FwrnwwmaEqYcckffC7wYmbaS6cBiX']
  }, tags: ['CEX'] },
  { name: 'Gemini', category: 'Exchange', addresses: {
    Bitcoin: ['bc1qprqhag26jkgkqx9he8nhj26e70gfrdh9kyc0pg', '3NjSp8FMFrei4ML6DpG5Lep2eHKy656mwX'],
    Ethereum: ['0x61edcdf5bb737adffe5043706e7c5bb1f1a56eea', '0x5f65f7b609678448494de4c87521cdf6cef1e932']
  }, tags: ['CEX'] },
  { name: 'MEXC', category: 'Exchange', addresses: {
    Ethereum: ['0xbf3aeb96e164ae67e763d9e050ff124e7c3fdd28', '0x0211f3cedbef3143223d3acf0e589747933e8527', '0xc640e81a122ed16d73019fbf6c7bfc211531e97d'],
    Tron: ['TPe7u5JMMLSk8PVp8qJcZGjMFhNWXkYLRh']
  }, tags: ['CEX'] },
  { name: 'BingX', category: 'Exchange', addresses: {
    Ethereum: ['0xe50d1bb772e65f0e7637afc6669dc0a964d043cb']
  }, tags: ['CEX'] },
  { name: 'Bithumb', category: 'Exchange', addresses: {
    Bitcoin: ['bc1qz2p5ul7w3lnz7q50a78gkqzz3xtls6h4axyxj'],
    Ethereum: ['0x18709e89bd403f470088abdacebe86cc60dda12e', '0x3fbe1f8fc5ddb27d428aa15e7818cf0df231850a']
  }, tags: ['CEX'] },
  { name: 'Upbit', category: 'Exchange', addresses: {
    Bitcoin: ['1PJiGp2yDLvUgqeBsuZVCDAza4rraj3vkA'],
    Ethereum: ['0xdc76cd25977e0a5ae17155770273ad58648900d3', '0xa1d8d972560c2f8144af871db508f0b0b10a3fbf']
  }, tags: ['CEX'] },
  { name: 'BitMEX', category: 'Exchange', addresses: {
    Bitcoin: ['bc1qe75775tzuvspl59lnr5pw7m0ary7anwkq6kv4m', '3BMEXV57mefvKK2P6XzBhW7C3Uq2g9KJ2m']
  }, tags: ['CEX', 'Derivatives'] },
  { name: 'Robinhood', category: 'Exchange', addresses: {
    Bitcoin: ['bc1qx9t2l3pyny2spqpqlye8svce70nppwtaxjdrqa'],
    Ethereum: ['0x40b38765696e3d5d8d9d834d8aad4bb6e418e489']
  }, tags: ['CEX', 'Public'] },
  { name: 'Bittrex', category: 'Exchange', addresses: {
    Bitcoin: ['38UmuUqPCrFmQo4khkomQwZ4VbY2nZMJ67']
  }, tags: ['CEX'] },
  { name: 'WazirX', category: 'Exchange', addresses: {
    Tron: ['TLu1FLYPkfb4fwkFN92BYtLwQ9fgJHjPnY']
  }, tags: ['CEX'] },
  { name: 'Poloniex', category: 'Exchange', addresses: {
    Tron: ['TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS']
  }, tags: ['CEX'] },
  { name: 'Phemex', category: 'Exchange', addresses: {
    Ethereum: ['0x1ab4973a48dc892cd9971ece8e01dcc7688f8f23']
  }, tags: ['CEX'] },
  { name: 'Bitstamp', category: 'Exchange', addresses: {
    Bitcoin: ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j']
  }, tags: ['CEX'] },

  // ── CORPORATE ──
  { name: 'MicroStrategy', category: 'Corporate', addresses: {
    Bitcoin: ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'bc1qazcm763858nkj2dz7g8hnt82hpnyqtqjag2dp4', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh']
  }, tags: ['BTC Treasury'] },
  { name: 'Tesla', category: 'Corporate', addresses: {}, tags: ['BTC Treasury', 'Public'] },
  { name: 'Block Inc', category: 'Corporate', addresses: {
    Bitcoin: ['bc1q8rv24c8k9f8d5gc8xpxf9ktzfeunpf0yyktxml']
  }, tags: ['BTC Treasury', 'Fintech'] },
  { name: 'Semler Scientific', category: 'Corporate', addresses: {}, tags: ['BTC Treasury'] },
  { name: 'Aker ASA', category: 'Corporate', addresses: {}, tags: ['BTC Treasury'] },
  { name: 'CleanSpark', category: 'Corporate', addresses: {}, tags: ['Mining', 'BTC Treasury'] },
  { name: 'Hut 8', category: 'Corporate', addresses: {}, tags: ['Mining'] },
  { name: 'Bitfarms', category: 'Corporate', addresses: {}, tags: ['Mining'] },
  { name: 'Northern Data', category: 'Corporate', addresses: {}, tags: ['Mining'] },
  { name: 'Axie Infinity', category: 'Corporate', addresses: {
    Ethereum: ['0x054d875c634f1fcebd19b71b6e3e5e7baed91d5c']
  }, tags: ['Gaming'] },
  { name: 'Yuga Labs', category: 'Corporate', addresses: {
    Ethereum: ['0xa18d6b41e9bfd2c31ea8ed9d09ff24c5852cdb06']
  }, tags: ['NFT'] },
  { name: 'OpenSea', category: 'Corporate', addresses: {
    Ethereum: ['0x4da45c8a33c8b4477df26a2292fc7c8e9d0d7cb4']
  }, tags: ['NFT', 'Marketplace'] },

  // ── GOVERNMENT ──
  { name: 'US Government', category: 'Government', addresses: {
    Bitcoin: ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'bc1q35a7gaqhvx8pqzgufxts8zhx7x3cqzq98kkld4', 'bc1qe9fsgze6ygt2u7mz9h0qkxkqdnzsl7p5gk8mqp', '1HQ3Go3ggs8pFnXuHVHRytPCq5fGG8Hbhx']
  }, tags: ['Seized', 'Sovereign'] },
  { name: 'El Salvador', category: 'Government', addresses: {
    Bitcoin: ['bc1q37b962ac2667ec45bafe40c5fb7e3afd860b68']
  }, tags: ['Sovereign'] },
  { name: 'Bhutan', category: 'Government', addresses: {
    Bitcoin: ['bc1q6b531f03bd2d6b00226022ebd3b1a1265f4a2c']
  }, tags: ['Sovereign'] },
  { name: 'Arbitrum Foundation', category: 'Government', addresses: {
    Ethereum: ['0x300da013abe1a3f8ec29736c912eeef441b3d1c0']
  }, tags: ['DAO', 'Treasury'] },
  { name: 'Optimism Foundation', category: 'Government', addresses: {
    Ethereum: ['0xae8cc6ee9539f1fca7d042f8d79ff51d19ad54eb']
  }, tags: ['DAO', 'Treasury'] },

  // ── DEFI ──
  { name: 'Lido', category: 'DeFi', addresses: {
    Ethereum: ['0xdc24316b9ae028f1497c275eb9192a3ea0f67022', '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0']
  }, tags: ['Liquid Staking'] },
  { name: 'Aave', category: 'DeFi', addresses: {
    Ethereum: ['0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2', '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9']
  }, tags: ['Lending'] },
  { name: 'Uniswap', category: 'DeFi', addresses: {
    Ethereum: ['0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503']
  }, tags: ['DEX'] },
  { name: 'Compound', category: 'DeFi', addresses: {
    Ethereum: ['0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b', '0xc3d688b66703497daa19211eedff47f25384cdc3']
  }, tags: ['Lending'] },
  { name: 'Curve', category: 'DeFi', addresses: {
    Ethereum: ['0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7', '0xa5407eae9ba41422680e2e00537571bcc53efbfd']
  }, tags: ['DEX', 'StableSwap'] },
  { name: 'Balancer', category: 'DeFi', addresses: {
    Ethereum: ['0xba12222222228d8ba445958a75a0704d566bf2c8']
  }, tags: ['DEX'] },
  { name: 'Maker', category: 'DeFi', addresses: {
    Ethereum: ['0x5a52e96bacdabb82fd05763e25335261b270efcb']
  }, tags: ['Lending', 'Stablecoin'] },
  { name: '1inch', category: 'DeFi', addresses: {
    Ethereum: ['0x1111111254eeb25477b68fb85ed929f73a960582']
  }, tags: ['DEX Aggregator'] },
  { name: 'SushiSwap', category: 'DeFi', addresses: {
    Ethereum: ['0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f']
  }, tags: ['DEX'] },
  { name: '0x', category: 'DeFi', addresses: {
    Ethereum: ['0xdef1c0ded9bec7f1a1670819833240f027b25eff']
  }, tags: ['DEX Aggregator'] },
  { name: 'CoW', category: 'DeFi', addresses: {
    Ethereum: ['0x9008d19f58aabd9ed0d60971565aa8510560ab41']
  }, tags: ['DEX Aggregator'] },
  { name: 'MetaMask', category: 'DeFi', addresses: {
    Ethereum: ['0x881d40237659c251811cec9c364ef91dc08d300c']
  }, tags: ['Wallet'] },
  { name: 'Rocket Pool', category: 'DeFi', addresses: {
    Ethereum: ['0xae78736cd615f374d3085123a210448e74fc6393', '0xd33526068d116ce69f19a9ee46f0bd304f21a51f', '0x457ff2cb4e0b3539c784f2d52507837dab4adf15']
  }, tags: ['Liquid Staking'] },
  { name: 'EigenLayer', category: 'DeFi', addresses: {
    Ethereum: ['0xc73f6738311e76d45dfed155f39773e68251d251', '0x858646372cc42e1a627fce94aa7a7033e7cf075a', '0x12eb4d32bb4509598c1bc08305f13a12eb0a503c']
  }, tags: ['Restaking'] },
  { name: 'Pendle', category: 'DeFi', addresses: {
    Ethereum: ['0x7713974908be4bed47172370115e8b1219f4a5f0']
  }, tags: ['Yield'] },
  { name: 'Aura', category: 'DeFi', addresses: {
    Ethereum: ['0x1e0049783f008a0085193e00003d00cd54003c71']
  }, tags: ['Yield'] },
  { name: 'Ondo Finance', category: 'DeFi', addresses: {
    Ethereum: ['0xfb4f4776d6e4215c658ac94b09a5f699aebb4b38']
  }, tags: ['RWA'] },
  { name: 'Centrifuge', category: 'DeFi', addresses: {
    Ethereum: ['0x2bc164f69b2d777451697e4055b5d49169ced11d']
  }, tags: ['RWA'] },
  { name: 'Maple Finance', category: 'DeFi', addresses: {
    Ethereum: ['0xce3f9d0a23792a8785d0ad5c8dcad5aced4bad1b']
  }, tags: ['Lending', 'Institutional'] },
  { name: 'Ether.fi', category: 'DeFi', addresses: {
    Ethereum: ['0x911837c9b8a102d1dcbbf8a7bd2cdc9123aa78cc']
  }, tags: ['Liquid Restaking'] },
  { name: 'Renzo', category: 'DeFi', addresses: {
    Ethereum: ['0xe6aa40515189d143a4269e7bda184af537302b2a']
  }, tags: ['Liquid Restaking'] },
  { name: 'Puffer Finance', category: 'DeFi', addresses: {
    Ethereum: ['0x572731a9d96b60f0efaca05595448cb4a656a15b']
  }, tags: ['Liquid Restaking'] },
  { name: 'Uniswap DAO', category: 'DeFi', addresses: {
    Ethereum: ['0x1a9C8182C09F50C8318d769245beA52c32BE35BC']
  }, tags: ['DAO', 'Treasury'] },
  { name: 'ENS DAO', category: 'DeFi', addresses: {
    Ethereum: ['0x0f722d6b523033d8cda53765077c0097724f8ceb']
  }, tags: ['DAO', 'Treasury'] },
  { name: 'Compound Governor Bravo', category: 'DeFi', addresses: {
    Ethereum: ['0x59cab25137ee2d41a4c0b7cdd4a5957adcc09553']
  }, tags: ['DAO'] },
  { name: 'Jito', category: 'DeFi', addresses: {
    Solana: ['sol63012e648b33d05b37dc4f35bff2cb8fcbfe44f68']
  }, tags: ['Liquid Staking', 'Solana'] },
  { name: 'Marinade Finance', category: 'DeFi', addresses: {
    Solana: ['sol8e7b893e9868a8c277a12a75fc87a07c1e327a458']
  }, tags: ['Liquid Staking', 'Solana'] },

  // ── MARKET MAKERS ──
  { name: 'Wintermute', category: 'MM', addresses: {
    Ethereum: ['0xa7efae728d2936e78bda97dc267687568dd593f3', '0x4f3a120e72c76c22ae802d129f599bfdbc31cb81', '0x8d5f052735452bf33b2148f75b0ba500e0bc6ecf'],
    Solana: ['4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY']
  }, tags: ['OTC'] },
  { name: 'Jump Trading', category: 'MM', addresses: {
    Ethereum: ['0x0716a17fbaee714f1e6ab0f9d59edbc5f09815c0', '0xf584f8728b874a6a5c7a8d4d387c9aae9172d621'],
    Solana: ['8rFz4HQ17dVHSGYCUbh1GFnGJ5UKEQtdT5kbyCVXMj4p', 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS']
  }, tags: ['OTC', 'HFT'] },
  { name: 'Cumberland DRW', category: 'MM', addresses: {
    Ethereum: ['0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511']
  }, tags: ['OTC'] },
  { name: 'Amber Group', category: 'MM', addresses: {
    Ethereum: ['0xcee284f754e854890e311e3280b767f80797180d', '0x8103683202aa8da10536036edef04cee4a4a6c18']
  }, tags: ['OTC'] },
  { name: 'Alameda Research', category: 'MM', addresses: {
    Ethereum: ['0xc9d0e1f2a3b4c5d6e7f8a9a0b1c2d3e4f5a6b7c8', '0xd0e1f2a3b4c5d6e7f8a9a0b1c2d3e4f5a6b7c8d9']
  }, tags: ['OTC', 'Defunct'] },

  // ── VC ──
  { name: 'Paradigm', category: 'VC', addresses: {
    Ethereum: ['0x9ef1b8c0e4f7dc8bf5719ea496883dc6401d5b2e']
  }, tags: ['Fund'] },
  { name: 'a16z', category: 'VC', addresses: {
    Ethereum: ['0xc55126051b22abb84bc022cef7c0ad360f2c1d41']
  }, tags: ['Fund'] },
  { name: 'Dragonfly', category: 'VC', addresses: {
    Ethereum: ['0xb153fb3d196a8eb25522705560bd2ba4ea0670f4']
  }, tags: ['Fund'] },
  { name: 'Multicoin', category: 'VC', addresses: {
    Ethereum: ['0x7bfee91193d9df2ac0bfe90191d40f23c773c060']
  }, tags: ['Fund'] },
  { name: 'Polychain', category: 'VC', addresses: {
    Ethereum: ['0x35f1c4a5e83dbbf3e0c6a34016c4e5e6d6c8f3a2']
  }, tags: ['Fund'] },
  { name: 'Pantera', category: 'VC', addresses: {
    Ethereum: ['0x1a9c8182c09f50c8318d769245bea52c32be35bc']
  }, tags: ['Fund'] },
  { name: 'Delphi', category: 'VC', addresses: {
    Ethereum: ['0x054b7ed3f45714d3091a302b02d71fd42bfb8c2e']
  }, tags: ['Fund', 'Research'] },
  { name: 'Three Arrows', category: 'VC', addresses: {
    Ethereum: ['0x1f28ed9d4792a567dad779235c2b766ab84d8e33', '0x4696fb45a920b3a0be78f7d46eca6b2bfdd9c4fb']
  }, tags: ['Fund', 'Defunct'] },
  { name: 'Animoca', category: 'VC', addresses: {
    Ethereum: ['0xf02e86d9e0efd57ad034faf52201b79917fe0713']
  }, tags: ['Fund', 'Gaming'] },
  { name: 'Sequoia', category: 'VC', addresses: {
    Ethereum: ['0x3744da57184575064838bbc87a0fc791f5e39ea2']
  }, tags: ['Fund'] },

  // ── MINERS ──
  { name: 'Marathon Digital', category: 'Miner', addresses: {
    Bitcoin: ['bc1qafk4ych6pxy7yqmjmnh0yghtjfcqmzcnjns7qa']
  }, tags: ['Public Miner', 'BTC Treasury'] },
  { name: 'Riot Platforms', category: 'Miner', addresses: {
    Bitcoin: ['bc1q7e56c5cfxq6c0dq3kzjtf38m6xrcej55wmr2yr']
  }, tags: ['Public Miner'] },
  { name: 'Core Scientific', category: 'Miner', addresses: {}, tags: ['Public Miner'] },
  { name: 'Cipher Mining', category: 'Miner', addresses: {}, tags: ['Public Miner'] },
  { name: 'Iris Energy', category: 'Miner', addresses: {}, tags: ['Public Miner'] },
  { name: 'BitDigital', category: 'Miner', addresses: {}, tags: ['Public Miner'] },
  { name: 'F2Pool', category: 'Miner', addresses: {
    Bitcoin: ['1BvB766Czh3ZRvS3FBj2nQ2DF6u2dMLxL3']
  }, tags: ['Mining Pool'] },
  { name: 'Antpool', category: 'Miner', addresses: {
    Bitcoin: ['1KFHE7w8BhaENAswwryaoccDb6qcT6DbYY']
  }, tags: ['Mining Pool'] },
  { name: 'FoundryUSA', category: 'Miner', addresses: {
    Bitcoin: ['18cBEMRxXHqzWWCxZNtU91F5sbUNKhL5PX']
  }, tags: ['Mining Pool'] },

  // ── WHALES ──
  { name: 'Justin Sun', category: 'Whale', addresses: {
    Ethereum: ['0x0938c63109801ee4243a487ab68d5cd86fc6e004', '0x176f3dab24a159341c0509bb36b833e7fdd0a132', '0xae2fc483527b8ef99eb5d9b44875f005ba1fae13']
  }, tags: ['Individual'] },
  { name: 'World Liberty Fi', category: 'Whale', addresses: {
    Ethereum: ['0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50']
  }, tags: ['DeFi', 'Trump'] },
  { name: 'FTX', category: 'Whale', addresses: {
    Ethereum: ['0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2']
  }, tags: ['Defunct', 'Estate'] },
  { name: 'Celsius', category: 'Whale', addresses: {
    Ethereum: ['0x9a9680813be4e0d40c0e7cc2ca8c6a3438a9e944', '0xe66b31678d6c16e9ebf358268a790b763c133750']
  }, tags: ['Defunct', 'Estate'] },
  { name: 'BlockFi', category: 'Whale', addresses: {
    Ethereum: ['0x4bd2a88b4c332c7a5bce1a4f294d7a75b1dc2bf6']
  }, tags: ['Defunct', 'Estate'] },
  { name: 'Vitalik', category: 'Whale', addresses: {
    Ethereum: ['0xab5801a7d398351b8be11c439e05c5b3259aec9b', '0xd8da6bf26964af9d7eed9e03e53415d37aa96045']
  }, tags: ['Individual', 'Founder'] },
  { name: 'Ethereum Foundation', category: 'Whale', addresses: {
    Ethereum: ['0x220866b1a2219f40e72f5c628b65d54268ca3a9d', '0x8ba1f109551bd432803012645ac136ddd64dba72', '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae']
  }, tags: ['Foundation'] },
  { name: 'Satoshi', category: 'Whale', addresses: {
    Bitcoin: ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', '12cbQLTFMXRnSzktFkuoG3eHoMeFtpTu3S']
  }, tags: ['Individual', 'Founder'] },
  { name: 'Anatoly', category: 'Whale', addresses: {
    Solana: ['toly1111111111111111111111111111111111111111']
  }, tags: ['Individual', 'Founder'] },

  // ── STABLECOINS ──
  { name: 'Tether', category: 'Stablecoin', addresses: {
    Ethereum: ['0x8894e0a0c962cb723c1ef8a1b0f8309e6c5a5f2e', '0x5dd596c901987a2b28c38a9c1dfbf86fffc15d77'],
    Tron: ['TWhDfwC8QE8pYxNJfZrfB2f2aH5HJ6e2X5', 'TLWDnCfN87P3qxNEJaGRWbK1mvNen9ZfSr']
  }, tags: ['Issuer'] },
  { name: 'Circle', category: 'Stablecoin', addresses: {
    Ethereum: ['0x5754284f345afc66a98fbb0a0afe71e0f007b949', '0x3bfc20f0b9afcace800d73d2191166ff16540258']
  }, tags: ['Issuer'] },
];

/* ═══════════════════════════════════════════════════════════
   CHAIN CONFIG
   ═══════════════════════════════════════════════════════════ */

const CHAINS = {
  all: { label: 'ALL', icon: '◈', color: '#0EA5C8', explorer: '' },
  Bitcoin: { label: 'BTC', icon: '₿', color: '#FFB84D', explorer: 'https://mempool.space' },
  Ethereum: { label: 'ETH', icon: 'Ξ', color: '#9BAEFF', explorer: 'https://etherscan.io' },
  Solana: { label: 'SOL', icon: '◎', color: '#C084FC', explorer: 'https://solscan.io' },
  Tron: { label: 'TRX', icon: '⟁', color: '#FF5A6C', explorer: 'https://tronscan.org' },
  Sui: { label: 'SUI', icon: '◐', color: '#7DD3FC', explorer: 'https://suiscan.xyz' },
  Sei: { label: 'SEI', icon: '◑', color: '#FB7185', explorer: 'https://www.seiscan.app' },
  Base: { label: 'BASE', icon: '◇', color: '#60A5FA', explorer: 'https://basescan.org' },
  Arbitrum: { label: 'ARB', icon: '◆', color: '#67E8F9', explorer: 'https://arbiscan.io' },
  Polygon: { label: 'POL', icon: '⬡', color: '#C4B5FD', explorer: 'https://polygonscan.com' },
  BSC: { label: 'BSC', icon: '◎', color: '#F0B90B', explorer: 'https://bscscan.com' },
  Optimism: { label: 'OP', icon: '◐', color: '#FF0420', explorer: 'https://optimistic.etherscan.io' },
  Avalanche: { label: 'AVAX', icon: '◈', color: '#E84142', explorer: 'https://snowtrace.io' },
  XRP: { label: 'XRP', icon: '✕', color: '#00AAE4', explorer: 'https://xrpscan.com' },
  NEAR: { label: 'NEAR', icon: 'Ⓝ', color: '#00C08B', explorer: 'https://nearblocks.io' },
} as const;

type ChainKey = keyof typeof CHAINS;

const TOKENS = {
  all: { label: 'ALL', color: '#0EA5C8' },
  BTC: { label: 'BTC', color: '#FFB84D' },
  ETH: { label: 'ETH', color: '#9BAEFF' },
  SOL: { label: 'SOL', color: '#C084FC' },
  TRX: { label: 'TRX', color: '#FF5A6C' },
  SUI: { label: 'SUI', color: '#7DD3FC' },
  SEI: { label: 'SEI', color: '#FB7185' },
  USDC: { label: 'USDC', color: '#60A5FA' },
  USDT: { label: 'USDT', color: '#34D399' },
  WBTC: { label: 'WBTC', color: '#FDBA74' },
} as const;

type TokenKey = keyof typeof TOKENS;

if (typeof window !== 'undefined') {
  prefetchTerminalModule('tracking');
}

/* ── Category colors for entity labels ── */
const CATEGORY_COLORS: Record<Entity['category'] | 'MM' | 'Unknown', string> = {
  ETF: '#3DFF9E',
  Exchange: '#60A5FA',
  Corporate: '#FFB84D',
  Government: '#FF6B7A',
  DeFi: '#C084FC',
  Whale: '#34E7FF',
  MM: '#9BAEFF',
  Fund: '#34E7FF',
  Miner: '#FFB84D',
  VC: '#C084FC',
  Stablecoin: '#34D399',
  Unknown: '#8EA0B7',
};

/* ── Top entities for the watchlist banner ── */
const FEATURED_ENTITIES: { name: string; icon: string; category: string; color: string }[] = [
  { name: 'MicroStrategy', icon: '₿', category: 'CORPORATE', color: '#FFB84D' },
  { name: 'BlackRock', icon: '◆', category: 'FUND', color: '#9BAEFF' },
  { name: 'Fidelity', icon: '◇', category: 'FUND', color: '#34E7FF' },
  { name: 'Grayscale', icon: '◈', category: 'FUND', color: '#C084FC' },
  { name: 'Coinbase', icon: 'Ⅽ', category: 'EXCHANGE', color: '#60A5FA' },
  { name: 'Binance', icon: 'Ⓑ', category: 'EXCHANGE', color: '#FACC15' },
  { name: 'US Government', icon: '⚑', category: 'GOV', color: '#0EA5C8' },
  { name: 'Justin Sun', icon: '⟁', category: 'WHALE', color: '#FF5A6C' },
  { name: 'Tether', icon: '₮', category: 'STABLECOIN', color: '#34D399' },
  { name: 'Circle', icon: '◉', category: 'STABLECOIN', color: '#60A5FA' },
  { name: 'ARK Invest', icon: '▲', category: 'FUND', color: '#FFB84D' },
  { name: 'Wintermute', icon: '❄', category: 'MM', color: '#9BAEFF' },
  { name: 'Jump Trading', icon: '⟐', category: 'MM', color: '#C084FC' },
  { name: 'Kraken', icon: 'Ⓚ', category: 'EXCHANGE', color: '#A78BFA' },
  { name: 'Galaxy Digital', icon: '✦', category: 'FUND', color: '#34E7FF' },
  { name: 'OKX', icon: 'Ⓞ', category: 'EXCHANGE', color: '#fff' },
];

const getExplorerTxUrl = (chain: string, sig: string) => {
  if (chain === 'Bitcoin') return `https://mempool.space/tx/${sig}`;
  if (chain === 'Ethereum') return `https://etherscan.io/tx/${sig}`;
  if (chain === 'Tron') return `https://tronscan.org/#/transaction/${sig}`;
  if (chain === 'Sui') return `https://suiscan.xyz/mainnet/tx/${sig}`;
  if (chain === 'Sei') return `https://www.seiscan.app/transactions/${sig}`;
  if (chain === 'Base') return `https://basescan.org/tx/${sig}`;
  if (chain === 'Arbitrum') return `https://arbiscan.io/tx/${sig}`;
  if (chain === 'Polygon') return `https://polygonscan.com/tx/${sig}`;
  if (chain === 'BSC') return `https://bscscan.com/tx/${sig}`;
  if (chain === 'Optimism') return `https://optimistic.etherscan.io/tx/${sig}`;
  if (chain === 'Avalanche') return `https://snowtrace.io/tx/${sig}`;
  if (chain === 'XRP') return `https://xrpscan.com/tx/${sig}`;
  if (chain === 'NEAR') return `https://nearblocks.io/txns/${sig}`;
  return `https://solscan.io/tx/${sig}`;
};

/* ── Entity registry helpers ── */
function lookupEntityByAddress(address: string): Entity | undefined {
  const normalized = address.toLowerCase();
  // Exact normalized equality ONLY. The previous bidirectional includes()
  // substring match false-positive-matched real addresses against truncated
  // seed rows (e.g. a 28-char munged prefix of a Binance wallet matched any
  // address starting with those characters). Fixed at the root in PROMPT-2.
  for (const entity of ENTITY_REGISTRY) {
    for (const addrs of Object.values(entity.addresses)) {
      for (const addr of addrs) {
        if (addr.toLowerCase() === normalized) {
          return entity;
        }
      }
    }
  }
  return undefined;
}

function lookupEntityByName(name: string): Entity | undefined {
  const normalized = name.toLowerCase();
  return ENTITY_REGISTRY.find(e => e.name.toLowerCase().includes(normalized));
}

function getEntityDisplay(address: string, apiLabel?: string): { label: string; category: string; color: string } {
  const entity = lookupEntityByAddress(address);
  if (entity) {
    return { label: entity.name, category: entity.category, color: CATEGORY_COLORS[entity.category] };
  }
  if (apiLabel && apiLabel !== 'Unknown') {
    return { label: apiLabel, category: 'Unknown', color: CATEGORY_COLORS.Unknown };
  }
  return { label: 'Unknown', category: 'Unknown', color: CATEGORY_COLORS.Unknown };
}

/* ── Address search cache ── */
interface SearchCacheEntry {
  result: Entity | null;
  timestamp: number;
}

const SEARCH_CACHE_TTL = 10 * 60 * 1000;

function getCachedAddressSearch(query: string): Entity | null | undefined {
  try {
    const raw = localStorage.getItem(`whale_search_${query.toLowerCase()}`);
    if (!raw) return undefined;
    const entry: SearchCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > SEARCH_CACHE_TTL) {
      localStorage.removeItem(`whale_search_${query.toLowerCase()}`);
      return undefined;
    }
    return entry.result;
  } catch {
    return undefined;
  }
}

function setCachedAddressSearch(query: string, result: Entity | null) {
  try {
    const entry: SearchCacheEntry = { result, timestamp: Date.now() };
    localStorage.setItem(`whale_search_${query.toLowerCase()}`, JSON.stringify(entry));
  } catch { /* silent */ }
}

/* ── Pure helpers (moved outside component for stability) ── */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Kraken', 'Bitfinex', 'OKX', 'Bybit', 'Huobi', 'KuCoin', 'Gate', 'Poloniex', 'FTX'];

const isSameExchangeMovement = (fromLabel: string, toLabel: string): boolean => {
  if (!fromLabel || !toLabel) return false;
  for (const ex of EXCHANGE_PREFIXES) {
    if (fromLabel.includes(ex) && toLabel.includes(ex)) return true;
  }
  return false;
};

const formatFreshness = (secs: number | null): string => {
  if (secs === null) return '—';
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
};

const formatAge = (ts: string) => {
  const normalized = ts.includes('Z') || ts.includes('+') ? ts : ts + 'Z';
  const diff = Date.now() - new Date(normalized).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'NOW';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
};

const formatUSD = (val: number) => {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const flowColor = (type: string) => {
  if (type === 'Self') return '#8EA0B7';
  if (type === 'Exchange Inflow' || type === 'Inflow') return '#34E7FF';
  if (type === 'Exchange Outflow' || type === 'Outflow') return '#0EA5C8';
  if (type === 'Whale Transfer') return '#C084FC';
  if (type === 'Miner Movement') return '#FFB84D';
  if (type === 'Mint') return '#34D399';
  if (type === 'Burn') return '#FF5A6C';
  if (type === 'Exchange Transfer') return '#9BAEFF';
  return '#D2DAE5';
};

const flowLabel = (type: string) => {
  // Canonical values from tracking cron; legacy aliases handled for backward compat.
  if (type === 'Self') return 'SELF';
  if (type === 'Exchange Inflow' || type === 'Inflow') return 'EXCH ⇩';
  if (type === 'Exchange Outflow' || type === 'Outflow') return 'EXCH ⇧';
  if (type === 'Exchange Transfer') return 'EXCH ⇄';
  if (type === 'Whale Transfer') return 'WHALE';
  if (type === 'Miner Movement') return 'MINER';
  if (type === 'Mint') return 'MINT';
  if (type === 'Burn') return 'BURN';
  return 'TRANSFER';
};

/* ── Category display helper — maps raw DB tags to consistent display labels ── */
const CATEGORY_DISPLAY: Record<string, string> = {
  etf:        'ETF',
  exchange:   'EXCHANGE',
  corporate:  'CORPORATE',
  government: 'GOVERNMENT',
  gov:        'GOVERNMENT',
  defi:       'DEFI',
  whale:      'WHALE',
  mm:         'MARKET MAKER',
  maker:      'MARKET MAKER',
  'market maker': 'MARKET MAKER',
  fund:       'FUND',
  institution:'INSTITUTION',
  stablecoin: 'STABLECOIN',
  miner:      'MINER',
  vc:         'VC',
  otc:        'OTC',
};

function formatCategory(raw: string | undefined | null): string {
  if (!raw) return '';
  const key = raw.trim().toLowerCase();
  return CATEGORY_DISPLAY[key] || raw.toUpperCase();
}

const chainColor = (chain: string) => CHAINS[chain as ChainKey]?.color || '#0EA5C8';
const chainIcon = (chain: string) => CHAINS[chain as ChainKey]?.icon || '◈';

const formatTimeAgo = (ts: string) => {
  if (!ts) return 'Never';
  const normalized = ts.includes('Z') || ts.includes('+') ? ts : ts + 'Z';
  const diff = Date.now() - new Date(normalized).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

// Spec: first 8 chars + ellipsis + last 6 chars
const shortenSig = (sig: string) => sig.length > 16 ? `${sig.slice(0, 8)}…${sig.slice(-6)}` : sig;
const shortenAddr = (addr: string) => addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

/* ═══════════════════════════════════════════════════════════
   THRESHOLD PRESETS
   ═══════════════════════════════════════════════════════════ */

const THRESHOLD_PRESETS = [
  { label: '$10K+', value: 10_000 },
  { label: '$50K+', value: 50_000 },
  { label: '$100K+', value: 100_000 },
  { label: '$250K+', value: 250_000 },
  { label: '$500K+', value: 500_000 },
  { label: '$1M+', value: 1_000_000 },
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

function TrkLiveClock() {
  const [t, setT] = useState(() => new Date().toISOString().replace('T', ' ').slice(0, 19));
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toISOString().replace('T', ' ').slice(0, 19)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div className="text-[15px] tabular-nums font-bold leading-none" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#FFFFFF', letterSpacing: '0.04em' }}>
        {t.slice(11)}
      </div>
      <div className="text-[11px] tabular-nums mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#5A6A7A' }}>
        {t.slice(0, 10)}
      </div>
    </>
  );
}

type TrackingContentProps = {
  onPrimaryDataReady: () => void;
};

/* Hard ceiling for initial data loads — keeps the boot gate from hanging on a slow endpoint */
const FETCH_TIMEOUT_MS = 12_000;

function TrackingContent({ onPrimaryDataReady }: TrackingContentProps) {
  const router = useRouter();

  /* ── Transaction state ── */
  const [transactions, setTransactions] = useState<WhaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [dataFreshnessSecs, setDataFreshnessSecs] = useState<number | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(() => Date.now());
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [chainFilter, setChainFilter] = useState<ChainKey>('all');
  const [feedWindows, setFeedWindows] = useState<{ w24: WindowStats | null; w7d: WindowStats | null; p24: WindowStats | null; p7d: WindowStats | null }>({ w24: null, w7d: null, p24: null, p7d: null });
  const [tokenFilter, setTokenFilter] = useState<TokenKey>('all');
  const [flowFilter, setFlowFilter] = useState<string>('all');
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [newTxIds, setNewTxIds] = useState<Set<number>>(new Set());
  const prevTxIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoad = useRef(true);
  const PAGE_SIZE = 100;

  /* ── Threshold state ── */
  const [threshold, setThreshold] = useState(100_000);

  /* ── Search state ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const entitySearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Entity state ── */
  const [entities, setEntities] = useState<EntityProfile[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(true);
  const [entitySearch, setEntitySearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [entityDetail, setEntityDetail] = useState<EntityDetailResponse | null>(null);
  const [isLoadingEntityDetail, setIsLoadingEntityDetail] = useState(false);

  /* ── View tab ── */
  const [activeTab, setActiveTab] = useState<'feed' | 'entities' | 'analytics'>('feed');

  /* ── Entity category filter ── */
  const [entityCategoryFilter, setEntityCategoryFilter] = useState<string>('ALL');
  const ENTITY_CATEGORIES = ['ALL', 'EXCHANGE', 'CORPORATE', 'FUND', 'MINER', 'MM', 'VC', 'DEFI', 'WHALE', 'STABLECOIN', 'GOV'];

  /* ── Holdings state ── */
  const [holdingsLeaderboard, setHoldingsLeaderboard] = useState<EntityLeaderboardRow[]>([]);
  const [holdingsStats, setHoldingsStats] = useState<{ entities_tracked: number; addresses_tracked: number; total_value_tracked: number; last_scan: string }>({ entities_tracked: 0, addresses_tracked: 0, total_value_tracked: 0, last_scan: '' });
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(true);
  const [entityHoldings, setEntityHoldings] = useState<EntityHoldingsDetail | null>(null);
  const [isLoadingEntityHoldings, setIsLoadingEntityHoldings] = useState(false);

  /* ── Address registry search state ── */
  const [addressSearchQuery, setAddressSearchQuery] = useState('');
  const [addressSearchResults, setAddressSearchResults] = useState<Entity[]>([]);
  const [showAddressSearchResults, setShowAddressSearchResults] = useState(false);
  const [isAddressSearching, setIsAddressSearching] = useState(false);
  const addressSearchRef = useRef<HTMLDivElement>(null);
  const addressSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoading && !isLoadingEntities && !isLoadingHoldings) onPrimaryDataReady();
  }, [isLoading, isLoadingEntities, isLoadingHoldings, onPrimaryDataReady]);

  /* ═══════════════════════════════════════════════════════════
     ADDRESS SEARCH
     ═══════════════════════════════════════════════════════════ */

  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (value.length < 2) { setSearchResults([]); setShowSearchDropdown(false); return; }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const resp = await fetch(`/api/address/?q=${encodeURIComponent(value)}`);
        const json = await resp.json() as { success: boolean; results: SearchResult[] };
        if (json.success) {
          setSearchResults(json.results || []);
          setShowSearchDropdown(true);
        }
      } catch { /* silent */ } finally { setIsSearching(false); }
    }, 300);
  }, []);

  const handleSearchSubmit = useCallback((addr: string) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    router.push(`/tracking/address?addr=${encodeURIComponent(addr)}`);
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── Address registry search ── */
  const handleAddressSearchInput = useCallback((value: string) => {
    setAddressSearchQuery(value);
    if (addressSearchDebounceRef.current) clearTimeout(addressSearchDebounceRef.current);
    if (value.length < 3) { setAddressSearchResults([]); setShowAddressSearchResults(false); return; }

    addressSearchDebounceRef.current = setTimeout(() => {
      setIsAddressSearching(true);
      try {
        // Check cache first
        const cached = getCachedAddressSearch(value);
        if (cached !== undefined) {
          setAddressSearchResults(cached ? [cached] : []);
          setShowAddressSearchResults(true);
          setIsAddressSearching(false);
          return;
        }

        // Search registry by address or name
        const normalized = value.toLowerCase();
        const matches: Entity[] = [];
        for (const entity of ENTITY_REGISTRY) {
          if (entity.name.toLowerCase().includes(normalized)) {
            matches.push(entity);
            continue;
          }
          for (const [chain, addrs] of Object.entries(entity.addresses)) {
            for (const addr of addrs) {
              if (addr.toLowerCase().includes(normalized) || normalized.includes(addr.toLowerCase())) {
                if (!matches.find(m => m.name === entity.name)) {
                  matches.push(entity);
                }
                break;
              }
            }
          }
        }

        // Cache result
        if (matches.length > 0) {
          setCachedAddressSearch(value, matches[0]);
          setAddressSearchResults(matches.slice(0, 5));
        } else {
          setCachedAddressSearch(value, null);
          setAddressSearchResults([]);
        }
        setShowAddressSearchResults(true);
      } catch { /* silent */ } finally {
        setIsAddressSearching(false);
      }
    }, 300);
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addressSearchRef.current && !addressSearchRef.current.contains(e.target as Node)) {
        setShowAddressSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ═══════════════════════════════════════════════════════════
     ENTITY FETCH
     ═══════════════════════════════════════════════════════════ */

  const fetchEntities = useCallback(async (q?: string) => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (q && q.length >= 2) params.set('q', q);
      const url = `/api/entities/?${params}`;
      const resp = q && q.length >= 2 ? await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }) : await fetchCached(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      const json = await resp.json() as { success: boolean; entities: EntityProfile[] };
      if (json.success) setEntities(json.entities || []);
    } catch { /* silent */ } finally { setIsLoadingEntities(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void fetchEntities(); }); }, [fetchEntities]);

  const handleEntitySearch = useCallback((value: string) => {
    setEntitySearch(value);
    if (entitySearchDebounceRef.current) clearTimeout(entitySearchDebounceRef.current);
    if (value.length >= 2) {
      entitySearchDebounceRef.current = setTimeout(() => {
        setIsLoadingEntities(true);
        fetchEntities(value);
      }, 300);
    } else if (value.length === 0) {
      entitySearchDebounceRef.current = setTimeout(() => {
        setIsLoadingEntities(true);
        fetchEntities();
      }, 100);
    }
  }, [fetchEntities]);

  const handleEntityClick = useCallback(async (entityName: string) => {
    if (selectedEntity === entityName) {
      setSelectedEntity(null);
      setEntityDetail(null);
      setEntityHoldings(null);
      return;
    }
    setSelectedEntity(entityName);
    setIsLoadingEntityDetail(true);
    setIsLoadingEntityHoldings(true);
    try {
      const [entityResp, holdingsResp] = await Promise.all([
        fetch(`/api/entities/?entity=${encodeURIComponent(entityName)}`),
        fetch(`/api/holdings/?entity=${encodeURIComponent(entityName)}`),
      ]);
      const entityJson = await entityResp.json() as EntityDetailResponse;
      if (entityJson.success) setEntityDetail(entityJson);
      const holdingsJson = await holdingsResp.json() as EntityHoldingsDetail;
      if (holdingsJson.success) setEntityHoldings(holdingsJson);
    } catch { /* silent */ } finally {
      setIsLoadingEntityDetail(false);
      setIsLoadingEntityHoldings(false);
    }
  }, [selectedEntity]);

  /* ═══════════════════════════════════════════════════════════
     HOLDINGS LEADERBOARD FETCH
     ═══════════════════════════════════════════════════════════ */

  const fetchHoldingsLeaderboard = useCallback(async () => {
    try {
      const resp = await fetchCached('/api/holdings/?top=50', { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      const json = await resp.json() as HoldingsLeaderboard;
      if (json.success) {
        setHoldingsLeaderboard(json.entities || []);
        setHoldingsStats(json.stats || { entities_tracked: 0, addresses_tracked: 0, total_value_tracked: 0, last_scan: '' });
      }
    } catch { /* silent */ } finally { setIsLoadingHoldings(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void fetchHoldingsLeaderboard(); }); }, [fetchHoldingsLeaderboard]);

  /* ═══════════════════════════════════════════════════════════
     TRANSACTION FETCH
     ═══════════════════════════════════════════════════════════ */

  const buildParams = useCallback((offset: number) => {
    const p = new URLSearchParams();
    p.set('limit', String(PAGE_SIZE));
    p.set('offset', String(offset));
    if (chainFilter !== 'all') p.set('chain', chainFilter);
    if (tokenFilter !== 'all') p.set('token', tokenFilter);
    if (flowFilter !== 'all') p.set('flow', flowFilter);
    p.set('min_usd', String(threshold));
    return p.toString();
  }, [chainFilter, tokenFilter, flowFilter, threshold]);

  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const url = `/api/tracking/?${buildParams(0)}`;
      const resp = isFirstLoad.current
        ? await fetchCached(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
        : await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      isFirstLoad.current = false;
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json() as ApiResponse;
      const txData = json.transactions ?? json.data;
      if (json.success && Array.isArray(txData)) {
        const currentIds = new Set(txData.map(tx => tx.id));
        const freshIds = new Set<number>();
        if (prevTxIdsRef.current.size > 0) {
          for (const id of currentIds) {
            if (!prevTxIdsRef.current.has(id)) freshIds.add(id);
          }
        }
        prevTxIdsRef.current = currentIds;
        if (freshIds.size > 0) {
          setNewTxIds(freshIds);
          setTimeout(() => setNewTxIds(new Set()), 3000);
        }
        setTransactions(txData);
        setHasMore(json.pagination?.hasMore ?? false);
        if (json.data_freshness_seconds !== undefined) {
          setDataFreshnessSecs(json.data_freshness_seconds);
        }
        setLastFetchTime(Date.now());
        setFeedWindows({
          w24: json.window_24h ?? null,
          w7d: json.window_7d ?? null,
          p24: json.prev_24h ?? null,
          p7d: json.prev_7d ?? null,
        });
        setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
      }
    } catch { /* silent */ } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [buildParams]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const resp = await fetch(`/api/tracking/?${buildParams(transactions.length)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json() as ApiResponse;
      if (json.success && Array.isArray(json.data)) {
        setTransactions(prev => [...prev, ...json.data]);
        setHasMore(json.pagination?.hasMore ?? false);
      }
    } catch { /* silent */ } finally {
      setIsLoadingMore(false);
    }
  }, [buildParams, transactions.length, isLoadingMore, hasMore]);

  useEffect(() => { queueMicrotask(() => { setIsLoading(true); void fetchData(); }); }, [fetchData]);
  useEffect(() => {
    // 30s polling — keeps the live feed feeling alive. Paused while the tab
    // is hidden so background tabs don't burn network + battery.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* ═══════════════════════════════════════════════════════════
     DERIVED DATA
     ═══════════════════════════════════════════════════════════ */

  // Apply client-side threshold filter
  const visibleTransactions = useMemo(() =>
    transactions.filter(tx => tx.amount_usd >= threshold),
    [transactions, threshold]
  );

  // Filtered featured entities matching search and category
  const filteredFeatured = useMemo(() => {
    let result = FEATURED_ENTITIES;
    if (entitySearch) {
      const q = entitySearch.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
      );
    }
    if (entityCategoryFilter !== 'ALL') {
      result = result.filter(e => e.category.toUpperCase() === entityCategoryFilter);
    }
    return result;
  }, [entitySearch, entityCategoryFilter]);

  /* ── Memoized derived render data ── */

  const mergedLeaderboard = useMemo(() => {
    const mergedMap = new Map<string, {
      entity: string; category: string; chains: string[];
      portfolio: number; volume: number; lastActive: string;
    }>();
    for (const h of holdingsLeaderboard) {
      mergedMap.set(h.entity, {
        entity: h.entity,
        category: h.category,
        chains: h.chains,
        portfolio: h.total_usd,
        volume: 0,
        lastActive: h.last_updated,
      });
    }
    for (const e of entities) {
      const existing = mergedMap.get(e.entity);
      if (existing) {
        existing.volume = e.total_volume;
        if (e.last_active) existing.lastActive = e.last_active;
        existing.chains = [...new Set([...existing.chains, ...e.chains])];
      } else {
        mergedMap.set(e.entity, {
          entity: e.entity,
          category: (e.tags || '').split(',')[0],
          chains: e.chains,
          portfolio: 0,
          volume: e.total_volume,
          lastActive: e.last_active,
        });
      }
    }
    return Array.from(mergedMap.values())
      .sort((a, b) => (b.portfolio || b.volume) - (a.portfolio || a.volume));
  }, [holdingsLeaderboard, entities]);

  const makersLeaderboard = useMemo(() => {
    return mergedLeaderboard.filter(e =>
      e.category?.toUpperCase() === 'MM' ||
      e.category?.toUpperCase().includes('MAKER') ||
      e.category?.toUpperCase().includes('MARKET')
    ).slice(0, 8);
  }, [mergedLeaderboard]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */


  return (
    <div
      className="tracking-contrast min-h-screen flex flex-col relative overflow-hidden font-mono"
      style={{ background: '#050A0E', color: '#F4F7FB', fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace' }}
    >
      {/* Subtle ambient grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, rgba(160,190,230,0.055) 1px, transparent 1px)`,
        backgroundSize: '36px 36px',
      }} />
      {/* Cold top-right ambient */}
      <div className="fixed pointer-events-none" style={{
        top: '-12vh', right: '-10vw', width: '55vw', height: '55vh',
        background: 'radial-gradient(ellipse at center, rgba(56,165,230,0.075) 0%, transparent 70%)',
        zIndex: 0,
      }} />
      {/* Header-color lower-left ambient */}
      <div className="fixed pointer-events-none" style={{
        bottom: '-12vh', left: '-8vw', width: '50vw', height: '50vh',
        background: 'radial-gradient(ellipse at center, rgba(14,165,200,0.055) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      <style jsx global>{`
        @keyframes whale-flash {
          0% { background-color: rgba(14,165,200,0.20); }
          50% { background-color: rgba(14,165,200,0.10); }
          100% { background-color: transparent; }
        }
        @keyframes flow-pulse {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
        @keyframes data-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .whale-new { animation: whale-flash 2.2s ease-out; }
        .flow-pulse { animation: flow-pulse 3s ease-in-out infinite; }
        .tracking-scroll::-webkit-scrollbar { width: 3px; }
        .tracking-scroll::-webkit-scrollbar-track { background: transparent; }
        .tracking-scroll::-webkit-scrollbar-thumb { background: rgba(178,196,218,0.34); border-radius: 2px; }
        .tracking-scroll::-webkit-scrollbar-thumb:hover { background: rgba(14,165,200,0.55); }
        .tx-row { transition: all 0.12s ease; }
        .tx-row:hover { background: rgba(52,231,255,0.11) !important; }
        .search-bar { transition: all 0.25s ease; }
        .search-bar:focus-within { border-color: rgba(14,165,200,0.58) !important; box-shadow: 0 0 24px rgba(14,165,200,0.14); }
        .entity-card { transition: all 0.18s ease; }
        .entity-card:hover { transform: translateY(-1px); }
        .entity-card.active { border-color: var(--accent) !important; box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 28%, transparent); }
        .threshold-btn { transition: all 0.12s ease; }
        .threshold-btn:hover { background: rgba(14,165,200,0.13) !important; }
        .threshold-btn.active { background: rgba(14,165,200,0.18) !important; color: #7DD3FC !important; border-color: rgba(14,165,200,0.55) !important; }
        .panel-glass {
          background: linear-gradient(180deg, rgba(14,18,26,0.99) 0%, rgba(8,11,17,0.99) 100%);
          border: 1px solid rgba(214,226,242,0.18);
          box-shadow: 0 24px 64px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.08);
        }
        .accent-bar-tracking {
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, rgba(14,165,200,0.85) 30%, rgba(14,165,200,0.85) 70%, transparent 100%);
        }
        .status-zone {
          position: relative;
        }
        .status-zone:not(:last-child)::after {
          content: '';
          position: absolute;
          right: 0;
          top: 20%;
          height: 60%;
          width: 1px;
          background: rgba(214,226,242,0.16);
        }
        .tracking-contrast .text-\[\#8EA0B7\] { color: #8EA0B7 !important; }
        .tracking-contrast .text-\[\#9EACBF\] { color: #9EACBF !important; }
        .tracking-contrast .text-\[\#B4C0CF\] { color: #B4C0CF !important; }
        .tracking-contrast .text-\[\#C5CEDA\] { color: #C5CEDA !important; }
        .tracking-contrast .text-\[\#D5DDE8\] { color: #D5DDE8 !important; }
        .tracking-contrast .text-\[\#E4EAF2\] { color: #E4EAF2 !important; }
        .tracking-contrast .placeholder-\[\#8EA0B7\]::placeholder { color: #98A8BC !important; opacity: 1; }
        .tracking-contrast input::placeholder { color: #98A8BC !important; opacity: 1; }
        .tracking-contrast table tbody tr { color: #F4F7FB; }
        .tracking-comfort { font-size: 15px; }
        .tracking-comfort .text-\[7px\] { font-size: 10px !important; }
        .tracking-comfort .text-\[8px\] { font-size: 11px !important; }
        .tracking-comfort .text-\[9px\] { font-size: 12px !important; }
        .tracking-comfort .text-\[10px\] { font-size: 13px !important; }
        .tracking-comfort .text-\[11px\] { font-size: 14px !important; }
        .tracking-comfort .text-\[12px\] { font-size: 15px !important; }
        .tracking-comfort .text-\[13px\] { font-size: 16px !important; }
        .tracking-comfort .text-\[14px\] { font-size: 18px !important; }
        .tracking-comfort .text-xs { font-size: 14px !important; }
        .tracking-comfort .text-sm { font-size: 16px !important; }
        .tracking-comfort .text-base { font-size: 18px !important; }
        .tracking-comfort input { font-size: 16px !important; }
        .tracking-comfort button { min-height: 36px; }
        .tracking-comfort th {
          font-size: 12.5px !important;
          padding: 13px 14px !important;
        }
        .tracking-comfort td {
          font-size: 13px;
          padding: 13px 14px !important;
          vertical-align: middle;
        }
        .tracking-comfort .tx-row {
          height: 66px;
        }
        .tracking-comfort .status-zone {
          min-height: 82px;
          padding: 18px 22px !important;
        }
        .tracking-comfort .panel-glass {
          border-color: rgba(214,226,242,0.24);
        }
        .tracking-comfort .entity-card {
          min-height: 88px;
          padding: 14px !important;
        }
        .tracking-comfort .threshold-btn {
          min-height: 34px;
          padding: 8px 10px !important;
        }
        .tracking-comfort .tracking-scroll {
          scrollbar-width: auto;
        }
        .tracking-comfort .leading-none {
          line-height: 1.2 !important;
        }
      `}</style>

      <TerminalModulePageShell
        header={{
          sectionLabel: 'TRACKING',
          title: 'TRACKING INTELLIGENCE',

          subtitle: 'Whale transaction flow and entity provenance across major chains',
          accent: '#0EA5C8',
          accentDark: '#0A4A6B',
          background: '#050A0E',
          clock: <TrkLiveClock />,
        }}
      >
        <div className="tracking-comfort">

        {/* ═══════════════════════════════════════════════════
            UNIFIED SEARCH BAR
            ═══════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
        >
          <div ref={searchRef} className="relative mb-5">
            <div className="search-bar relative flex items-center overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(14,18,26,0.99), rgba(8,11,17,0.99))',
                border: '1px solid rgba(14,165,200,0.32)',
                borderRadius: 0,
              }}>
              {/* Sweep animation line */}
              <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
                <div style={{
                  width: '33%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(14,165,200,0.65), transparent)',
                  animation: 'sweep 3.5s linear infinite',
                }} />
              </div>
              <div className="pl-4 pr-3 flex items-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B4C0CF" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.length >= 2) handleSearchSubmit(searchQuery);
                }}
                onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                placeholder="Search address, entity, or label — e.g. MicroStrategy, 0x28c6..., Binance Cold"
                className="flex-1 bg-transparent text-[12px] sm:text-[13px] font-mono text-white placeholder-[#8EA0B7] py-4 px-3 outline-none"
                style={{ caretColor: '#0EA5C8' }}
              />
              {isSearching && (
                <div className="pr-3">
                  <div className="w-3 h-3 rounded-full border-2 border-[#0EA5C8] border-t-transparent animate-spin" />
                </div>
              )}
              {searchQuery.length >= 8 && !isSearching && (
                <button onClick={() => handleSearchSubmit(searchQuery)}
                  className="mr-3 px-4 py-2 text-[9px] font-mono font-bold tracking-wider transition-all"
                  style={{ color: '#7DD3FC', background: 'rgba(14,165,200,0.16)', border: '1px solid rgba(14,165,200,0.42)' }}>
                  TRACE
                </button>
              )}
            </div>

            {/* Search dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 overflow-hidden z-50"
                style={{
                  background: 'rgba(8,11,17,0.99)',
                  border: '1px solid rgba(14,165,200,0.34)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 0,
                }}>
                <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(14,165,200,0.22)' }}>
                  <span className="text-[9px] font-mono text-[#B4C0CF] tracking-wider">
                    SEARCH RESULTS
                  </span>
                </div>
                <div className="max-h-[280px] overflow-y-auto tracking-scroll">
                  {searchResults.map((r, i) => {
                    const cc = CHAINS[r.blockchain as ChainKey]?.color || '#0EA5C8';
                    const ci = CHAINS[r.blockchain as ChainKey]?.icon || '◈';
                    return (
                      <button key={i}
                        onClick={() => handleSearchSubmit(r.address)}
                        className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all hover:bg-[rgba(14,165,200,0.11)]"
                        style={{ borderBottom: '0.5px solid rgba(214,226,242,0.10)' }}>
                        <span className="text-lg flex-shrink-0" style={{ color: cc }}>{ci}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-white truncate">{r.label}</span>
                            {r.entity && <span className="text-[9px] font-mono text-[#B4C0CF]">{r.entity}</span>}
                          </div>
                          <div className="text-[10px] font-mono text-[#B4C0CF] truncate">{r.address}</div>
                        </div>
                        {r.tags && (
                          <div className="flex gap-1 flex-shrink-0">
                            {r.tags.split(',').slice(0, 2).map(tag => (
                              <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5"
                                style={{ color: cc, background: `${cc}22`, border: `0.5px solid ${cc}66`, borderRadius: 0 }}>
                                {tag.trim().toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-[#B4C0CF] text-xs flex-shrink-0">→</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════
            VIEW TABS
            ═══════════════════════════════════════════════════ */}
        <div className="flex items-center gap-1 mb-5 px-1">
          {([
            { id: 'feed' as const, label: 'LIVE FEED', icon: '▸' },
            { id: 'analytics' as const, label: 'ANALYTICS', icon: '◈' },
            { id: 'entities' as const, label: 'ENTITIES', icon: '◇' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-[9px] font-mono font-bold tracking-wider transition-all flex items-center gap-2"
              style={{
                color: activeTab === tab.id ? '#0EA5C8' : '#8EA0B7',
                background: activeTab === tab.id ? 'rgba(14,165,200,0.12)' : 'transparent',
                borderBottom: `2px solid ${activeTab === tab.id ? '#0EA5C8' : 'transparent'}`,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════
            ANALYTICS VIEW
            ═══════════════════════════════════════════════════ */}
        {activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <TrackingDataPanels />
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
            MAIN DUAL-PANEL LAYOUT (FEED + ENTITIES)
            ═══════════════════════════════════════════════════ */}
        {activeTab !== 'analytics' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] 3xl:grid-cols-[minmax(0,1fr)_minmax(480px,600px)] gap-6">

          {/* ═══════════════════════════════════════════════
              LEFT: FLOW MONITOR
              ═══════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="min-w-0 flex flex-col gap-5"
          >
            {/* Rolling window stats — 24h/7d volume + net flow vs previous window (filter-independent) */}
            {(feedWindows.w24 || feedWindows.w7d) && (() => {
              const pctDelta = (cur: number, prev: number): number | null =>
                (Number.isFinite(prev) && prev !== 0) ? ((cur - prev) / Math.abs(prev)) * 100 : null;
              const tiles: { label: string; cur: number; prev: number; signed: boolean }[] = [
                { label: '24H VOLUME',  cur: feedWindows.w24?.total_volume ?? 0, prev: feedWindows.p24?.total_volume ?? 0, signed: false },
                { label: '24H NET FLOW', cur: feedWindows.w24?.net_flow ?? 0,    prev: feedWindows.p24?.net_flow ?? 0,    signed: true  },
                { label: '7D VOLUME',   cur: feedWindows.w7d?.total_volume ?? 0, prev: feedWindows.p7d?.total_volume ?? 0, signed: false },
                { label: '7D NET FLOW',  cur: feedWindows.w7d?.net_flow ?? 0,    prev: feedWindows.p7d?.net_flow ?? 0,    signed: true  },
              ];
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'rgba(214,226,242,0.14)', border: '1px solid rgba(214,226,242,0.22)' }}>
                  {tiles.map((tile) => {
                    const delta = pctDelta(tile.cur, tile.prev);
                    const valueText = tile.signed
                      ? `${tile.cur >= 0 ? '+' : '−'}${formatUSD(Math.abs(tile.cur))}`
                      : formatUSD(tile.cur);
                    const valueColor = tile.signed ? (tile.cur >= 0 ? '#22C55E' : '#EF4444') : '#FAFAFA';
                    return (
                      <div key={tile.label} className="px-3 py-2.5" style={{ background: '#0B1118' }}>
                        <div className="text-[7.5px] font-mono tracking-[0.18em] text-[#8EA0B7] mb-1">{tile.label}</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-mono font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: valueColor }}>
                            {valueText}
                          </span>
                          {delta !== null && (
                            <span className="text-[8.5px] font-mono tabular-nums" style={{ color: delta >= 0 ? '#22C55E' : '#EF4444' }}>
                              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Control Bar */}
            <div className="flex flex-wrap items-center gap-3 px-3 py-3"
              style={{ background: '#0B1118', border: '1px solid rgba(214,226,242,0.22)' }}>
              {/* Chain filters */}
              <div className="flex flex-wrap gap-1 px-2">
                {(Object.keys(CHAINS) as ChainKey[]).map(key => {
                  const c = CHAINS[key];
                  const isActive = chainFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setChainFilter(key)}
                      className="px-2.5 py-2 text-[9px] font-mono font-bold transition-all flex items-center gap-1.5"
                      style={{
                        background: isActive ? `${c.color}22` : 'transparent',
                        color: isActive ? c.color : '#B4C0CF',
                        borderRadius: 0,
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{c.icon}</span>
                      {c.label}
                    </button>
                  );
                })}
              </div>

              <div className="w-px h-5 bg-[rgba(214,226,242,0.16)] hidden sm:block" />

              {/* Threshold */}
              <div className="flex flex-wrap items-center gap-2 px-2">
                <span className="text-[9px] font-mono text-[#B4C0CF] tracking-wider">MIN:</span>
                <div className="flex flex-wrap gap-0">
                  {THRESHOLD_PRESETS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setThreshold(t.value)}
                      className={`threshold-btn px-2.5 py-2 text-[8px] font-mono font-bold ${threshold === t.value ? 'active' : ''}`}
                      style={{
                        color: threshold === t.value ? '#0EA5C8' : '#B4C0CF',
                        border: `1px solid ${threshold === t.value ? 'rgba(14,165,200,0.50)' : 'transparent'}`,
                        borderRadius: 0,
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
              style={{ background: '#0B1118', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-[9px] font-mono text-[#B4C0CF] tracking-wider">FILTERS:</span>

              {/* Chain dropdown */}
              <select
                value={chainFilter}
                onChange={e => setChainFilter(e.target.value as ChainKey)}
                className="bg-transparent text-[10px] font-mono text-white outline-none px-2 py-1.5 cursor-pointer"
                style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#B4C0CF' }}
              >
                <option value="all" style={{ background: '#0B1118' }}>All Chains</option>
                {(Object.keys(CHAINS).filter(k => k !== 'all') as ChainKey[]).map(key => (
                  <option key={key} value={key} style={{ background: '#0B1118' }}>
                    {CHAINS[key].label}
                  </option>
                ))}
              </select>

              {/* Direction dropdown */}
              <select
                value={flowFilter}
                onChange={e => setFlowFilter(e.target.value as typeof flowFilter)}
                className="bg-transparent text-[10px] font-mono text-white outline-none px-2 py-1.5 cursor-pointer"
                style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#B4C0CF' }}
              >
                <option value="all" style={{ background: '#0B1118' }}>All Directions</option>
                <option value="Exchange Inflow" style={{ background: '#0B1118' }}>Exchange Inflow</option>
                <option value="Exchange Outflow" style={{ background: '#0B1118' }}>Exchange Outflow</option>
                <option value="Exchange Transfer" style={{ background: '#0B1118' }}>Exchange Transfer</option>
                <option value="Whale Transfer" style={{ background: '#0B1118' }}>Whale Transfer</option>
                <option value="Miner Movement" style={{ background: '#0B1118' }}>Miner Movement</option>
                <option value="Mint" style={{ background: '#0B1118' }}>Mint</option>
                <option value="Burn" style={{ background: '#0B1118' }}>Burn</option>
              </select>

              {/* Token dropdown */}
              <select
                value={tokenFilter}
                onChange={e => setTokenFilter(e.target.value as TokenKey)}
                className="bg-transparent text-[10px] font-mono text-white outline-none px-2 py-1.5 cursor-pointer"
                style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#B4C0CF' }}
              >
                <option value="all" style={{ background: '#0B1118' }}>All Tokens</option>
                {(Object.keys(TOKENS).filter(k => k !== 'all') as TokenKey[]).map(key => (
                  <option key={key} value={key} style={{ background: '#0B1118' }}>
                    {TOKENS[key].label}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* Transaction Tape */}
            <div className="panel-glass overflow-hidden flex-1">
              <div className="accent-bar-tracking" />
              <div className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: '1px solid rgba(214,226,242,0.14)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#0EA5C8] font-bold tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>▸ LIVE FEED</span>
                  {threshold > 0 && (
                    <span className="text-[8px] font-mono text-[#0EA5C8] px-1.5 py-0.5"
                      style={{ background: 'rgba(14,165,200,0.14)', border: '1px solid rgba(14,165,200,0.34)', borderRadius: 0 }}>
                      {formatUSD(threshold)}+
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {lastUpdated && (
                    <span className="text-[8px] font-mono text-[#9EACBF] tracking-wider">
                      Last updated: {lastUpdated}
                    </span>
                  )}
                  <span className="text-[8px] font-mono text-[#9EACBF] tracking-wider">
                    {formatFreshness(dataFreshnessSecs)}
                  </span>
                  {isFetching && (
                    <span className="text-[8px] font-mono text-[#0EA5C8] tracking-wider flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full border border-[#0EA5C8] border-t-transparent animate-spin inline-block" />
                      UPDATING
                    </span>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex gap-3 items-center" style={{ animation: `data-in 0.3s ease ${i * 0.04}s both` }}>
                      <div className="h-3 w-7 rounded-sm bg-[#0D0D0F]" />
                      <div className="h-3 w-5 rounded-sm bg-[#0D0D0F]" />
                      <div className="h-3 w-24 rounded-sm bg-[#0A0A0C]" />
                      <div className="h-3 w-24 rounded-sm bg-[#0A0A0C]" />
                      <div className="h-3 w-16 rounded-sm bg-[#0D0D0F]" />
                      <div className="h-3 w-12 rounded-sm bg-[#0A0A0C]" />
                      <div className="h-3 w-6 rounded-sm bg-[#0D0D0F]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto tracking-scroll" style={{ maxHeight: 'calc(100vh - 180px)', minHeight: '500px' }}>
                  <table className="w-full min-w-[740px] xl:min-w-[780px] 2xl:min-w-[920px]" style={{ borderCollapse: 'collapse' }}>
                    <thead className="sticky top-0 z-10" style={{ background: '#0A0A0E' }}>
                      <tr style={{ borderBottom: '1px solid rgba(214,226,242,0.14)' }}>
                        {['CHAIN', 'DIRECTION', 'FROM', 'TO', 'VALUE', 'WHEN', 'TX'].map(col => (
                          <th key={col}
                            className="px-2.5 py-2 text-left text-[9px] font-mono tracking-[0.14em]"
                            style={{ color: 'rgba(125,211,252,0.95)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-20">
                              <div className="text-[#B4C0CF]">
                              <div className="mb-3 text-2xl opacity-20 font-mono">⌀</div>
                              <div className="text-[#C5CEDA] font-bold mb-1 text-xs tracking-wider font-mono">NO TRANSACTIONS ABOVE {formatUSD(threshold)}</div>
                              <div className="text-[11px] text-[#9EACBF] font-sans">Lower the minimum threshold to see more transactions</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <>
                          {visibleTransactions.map((tx) => {
                            const isExpanded = selectedRow === tx.id;
                            const isNew = newTxIds.has(tx.id);
                            const cc = chainColor(tx.blockchain);
                            const isExceptional = tx.amount_usd >= 50_000_000;
                            const isInternalExchange = isSameExchangeMovement(tx.sender_label, tx.receiver_label);
                            const isPending = (tx.is_pending ?? 0) === 1;
                            const leftBorderColor = isExceptional ? '#F7931A' : isExpanded ? cc : 'transparent';

                            const senderDisplay = getEntityDisplay(tx.sender, tx.sender_label);
                            const receiverDisplay = getEntityDisplay(tx.receiver, tx.receiver_label);

                            return (
                              <>
                                <tr
                                  key={`${tx.id}-row`}
                                  onClick={() => setSelectedRow(isExpanded ? null : tx.id)}
                                  className={`tx-row cursor-pointer ${isNew ? 'whale-new' : ''}`}
                                  style={{
                                    borderBottom: '0.5px solid rgba(214,226,242,0.10)',
                                    background: isExpanded
                                      ? 'rgba(14,165,200,0.10)'
                                      : undefined,
                                    borderLeft: `2px solid ${leftBorderColor}`,
                                    opacity: isInternalExchange && !isExpanded ? 0.72 : 1,
                                  }}
                                >
                                  <td className="px-2.5 py-2">
                                    <div className="flex items-center gap-1.5">
                                      <span style={{ color: cc, fontSize: '15px' }}>{chainIcon(tx.blockchain)}</span>
                                      <div className="flex flex-col leading-none">
                                        <span className="text-[10px] font-mono font-bold" style={{ color: cc }}>
                                          {CHAINS[tx.blockchain as ChainKey]?.label || tx.blockchain}
                                        </span>
                                        <div className="flex gap-1 mt-0.5">
                                          {isExceptional && (
                                            <span className="text-[8px] font-mono px-1 py-px" style={{ color: '#FFD08A', background: 'rgba(247,147,26,0.18)', border: '0.5px solid rgba(247,147,26,0.55)', borderRadius: 0 }}>$50M+</span>
                                          )}
                                          {isPending && (
                                            <span className="text-[8px] font-mono px-1 py-px" style={{ color: '#FCD34D', background: 'rgba(245,158,11,0.18)', border: '0.5px solid rgba(245,158,11,0.55)', borderRadius: 0 }}>PENDING</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="px-2.5 py-2">
                                    <div className="flex flex-col items-center leading-none">
                                      <span style={{ color: flowColor(tx.flow_type), fontSize: '14px' }}>
                                        {tx.flow_type.includes('Inflow') ? '▲' : tx.flow_type.includes('Outflow') ? '▼' : '⇄'}
                                      </span>
                                      <span className="text-[7px] font-mono tracking-[0.1em] mt-0.5" style={{ color: flowColor(tx.flow_type), opacity: 0.8 }}>
                                        {flowLabel(tx.flow_type)}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="px-2.5 py-2">
                                    <div className="flex flex-col leading-none min-w-[80px]">
                                      <span className="text-[10px] font-mono font-bold mb-px truncate" style={{ color: senderDisplay.color }}>
                                        {senderDisplay.label}
                                      </span>
                                      {senderDisplay.category !== 'Unknown' && (
                                        <span className="text-[7px] font-mono mb-px tracking-wider" style={{ color: senderDisplay.color, opacity: 0.8 }}>
                                          {senderDisplay.category.toUpperCase()}
                                        </span>
                                      )}
                                      <span
                                        onClick={(e) => { e.stopPropagation(); handleSearchSubmit(tx.sender); }}
                                        className="text-[8px] font-mono text-[#8EA0B7] hover:text-[#0EA5C8] transition-colors cursor-pointer"
                                      >
                                        {shortenAddr(tx.sender)}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="px-2.5 py-2">
                                    <div className="flex flex-col leading-none min-w-[80px]">
                                      <span className="text-[10px] font-mono font-bold mb-px truncate" style={{ color: receiverDisplay.color }}>
                                        {receiverDisplay.label}
                                      </span>
                                      {receiverDisplay.category !== 'Unknown' && (
                                        <span className="text-[7px] font-mono mb-px tracking-wider" style={{ color: receiverDisplay.color, opacity: 0.8 }}>
                                          {receiverDisplay.category.toUpperCase()}
                                        </span>
                                      )}
                                      <span
                                        onClick={(e) => { e.stopPropagation(); handleSearchSubmit(tx.receiver); }}
                                        className="text-[8px] font-mono text-[#8EA0B7] hover:text-[#0EA5C8] transition-colors cursor-pointer"
                                      >
                                        {shortenAddr(tx.receiver)}
                                      </span>
                                    </div>
                                  </td>

                                  <td className="px-2.5 py-2">
                                    <div className="flex flex-col leading-none">
                                      <span className="text-[12px] font-mono font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: tx.amount_usd >= 50_000_000 ? '#FFD08A' : '#FAFAFA' }}>
                                        {formatUSD(tx.amount_usd)}
                                      </span>
                                      <span className="text-[8px] font-mono tabular-nums mt-0.5" style={{ color: cc, fontFamily: "'JetBrains Mono', monospace" }}>
                                        {tx.amount_native > 0
                                          ? `${tx.amount_native.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${tx.token}`
                                          : '—'}
                                      </span>
                                      {tx.amount_native > 0 && (
                                        <span className="text-[7.5px] font-mono tabular-nums mt-px" style={{ color: '#8EA0B7', fontFamily: "'JetBrains Mono', monospace" }}>
                                          @ {formatUSD(tx.amount_usd / tx.amount_native)}/{tx.token}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="px-2.5 py-2">
                                    <span className={`text-[10px] font-mono tabular-nums ${formatAge(tx.timestamp) === 'NOW' ? 'text-[#3DFF9E] font-bold' : 'text-[#C5CEDA]'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                      {formatAge(tx.timestamp)}
                                    </span>
                                  </td>

                                  <td className="px-2.5 py-2">
                                    <a
                                      href={getExplorerTxUrl(tx.blockchain, tx.signature)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="text-[9px] font-mono hover:underline transition-colors"
                                      style={{ color: cc }}
                                    >
                                      {shortenSig(tx.signature)}
                                    </a>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr key={`${tx.id}-expanded`} style={{ background: 'rgba(14,165,200,0.05)' }}>
                                    <td colSpan={7} className="px-5 py-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <div className="text-[8px] font-mono text-[#B4C0CF] tracking-wider mb-1">FROM</div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold" style={{ color: senderDisplay.color }}>{senderDisplay.label}</span>
                                            <span className="text-[8px] font-mono" style={{ color: senderDisplay.color, opacity: 0.7 }}>{senderDisplay.category.toUpperCase()}</span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-mono text-[#D5DDE8]">{tx.sender}</span>
                                            <button onClick={() => copyToClipboard(tx.sender)} className="text-[8px] font-mono text-[#8EA0B7] hover:text-[#E8960C] transition-colors">COPY</button>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-[8px] font-mono text-[#B4C0CF] tracking-wider mb-1">TO</div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold" style={{ color: receiverDisplay.color }}>{receiverDisplay.label}</span>
                                            <span className="text-[8px] font-mono" style={{ color: receiverDisplay.color, opacity: 0.7 }}>{receiverDisplay.category.toUpperCase()}</span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-mono text-[#D5DDE8]">{tx.receiver}</span>
                                            <button onClick={() => copyToClipboard(tx.receiver)} className="text-[8px] font-mono text-[#8EA0B7] hover:text-[#E8960C] transition-colors">COPY</button>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-[8px] font-mono text-[#B4C0CF] tracking-wider mb-1">VALUE</div>
                                          <span className="text-[12px] font-mono font-bold text-white tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                            ${tx.amount_usd.toLocaleString('en-US', { minimumFractionDigits: 4 })}
                                          </span>
                                        </div>
                                        <div>
                                          <div className="text-[8px] font-mono text-[#B4C0CF] tracking-wider mb-1">NATIVE</div>
                                          <span className="text-[9px] font-mono text-[#D5DDE8] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                            {tx.amount_native > 0
                                              ? `${tx.amount_native.toLocaleString('en-US', { maximumFractionDigits: 8 })} ${tx.token}`
                                              : '—'}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                          {hasMore && (
                            <tr>
                              <td                                    colSpan={7} className="text-center py-3">
                                <button
                                  onClick={(e) => { e.stopPropagation(); loadMore(); }}
                                  disabled={isLoadingMore}
                                  className="px-5 py-1.5 text-[10px] font-mono font-bold tracking-wider transition-all"
                                  style={{
                                    color: isLoadingMore ? '#B4C0CF' : '#7DD3FC',
                                    border: `1px solid ${isLoadingMore ? 'rgba(214,226,242,0.22)' : 'rgba(14,165,200,0.45)'}`,
                                    background: isLoadingMore ? 'rgba(214,226,242,0.08)' : 'rgba(14,165,200,0.14)',
                                    borderRadius: 0,
                                  }}
                                >
                                  {isLoadingMore ? '↻ LOADING...' : '▼ LOAD MORE'}
                                </button>
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════════
              RIGHT: ENTITY RADAR
              ═══════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="min-w-0 flex flex-col gap-5"
          >
            {/* Watchlist Grid */}
            <div className="panel-glass p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-[#0EA5C8] font-bold tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>▸ WATCHLIST</span>
                <input
                  type="text"
                  value={entitySearch}
                  onChange={e => handleEntitySearch(e.target.value)}
                  placeholder="Filter..."
                  className="bg-transparent text-[9px] font-mono text-white placeholder-[#8EA0B7] outline-none text-right w-28"
                  style={{ caretColor: '#0EA5C8' }}
                />
              </div>
              {/* Category filter tabs */}
              <div className="flex flex-wrap gap-1 mb-3">
                {ENTITY_CATEGORIES.map(cat => {
                  const isActive = entityCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setEntityCategoryFilter(cat)}
                      className="px-2 py-1 text-[8px] font-mono font-bold transition-all"
                      style={{
                        background: isActive ? 'rgba(14,165,200,0.18)' : 'transparent',
                        color: isActive ? '#7DD3FC' : '#8EA0B7',
                        border: `1px solid ${isActive ? 'rgba(14,165,200,0.45)' : 'rgba(214,226,242,0.12)'}`,
                        borderRadius: 0,
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4 gap-2.5">
                {filteredFeatured.slice(0, 16).map((ent) => {
                  const isActive = selectedEntity === ent.name;
                  const holdingsData = holdingsLeaderboard.find(h => h.entity === ent.name);
                  const entityData = entities.find(e => e.entity === ent.name);
                  // Prefer DB category over hardcoded, falling back to the static value
                  const dbCategory = holdingsData?.category
                    || (entityData?.tags ? entityData.tags.split(',')[0] : undefined);
                  const displayCategory = formatCategory(dbCategory) || formatCategory(ent.category);
                  return (
                    <button
                      key={ent.name}
                      onClick={() => {
                        const entity = lookupEntityByName(ent.name);
                        const firstAddr = entity ? Object.values(entity.addresses).flat()[0] : undefined;
                        if (firstAddr) {
                          router.push(`/tracking/address?addr=${encodeURIComponent(firstAddr)}`);
                        }
                      }}
                      className={`entity-card p-3.5 text-left ${isActive ? 'active' : ''}`}
                      style={{
                        '--accent': ent.color,
                        background: isActive
                          ? `linear-gradient(135deg, ${ent.color}06, ${ent.color}02)`
                          : 'linear-gradient(135deg, rgba(214,226,242,0.12), rgba(214,226,242,0.045))',
                        border: `1px solid ${isActive ? `${ent.color}66` : 'rgba(214,226,242,0.20)'}`,
                        borderRadius: 0,
                        cursor: 'pointer',
                      } as React.CSSProperties}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[13px] leading-none" style={{ color: ent.color }}>{ent.icon}</span>
                        <span className="text-[9px] font-mono font-bold text-white truncate">{ent.name}</span>
                        {entityData && entityData.tx_count > 0 && (
                          <span className="text-[7px] font-mono font-bold px-1 py-px ml-auto"
                            style={{ color: ent.color, background: `${ent.color}18`, border: `0.5px solid ${ent.color}44`, borderRadius: 0 }}>
                            {entityData.tx_count.toLocaleString()} tx
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono tracking-wider" style={{ color: ent.color, opacity: 0.95 }}>
                        {displayCategory}
                      </div>
                      {holdingsData && holdingsData.total_usd > 0 && (
                        <div className="text-[9px] font-mono font-black text-white tabular-nums mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatUSD(holdingsData.total_usd)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Entity Detail Panel */}
            <AnimatePresence>
              {selectedEntity && (
                <motion.div
                  key={`detail-${selectedEntity}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="panel-glass overflow-hidden"
                >
                  {(isLoadingEntityDetail || isLoadingEntityHoldings) ? (
                    <div className="p-6 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full border-2 border-[#0EA5C8] border-t-transparent animate-spin" />
                      <span className="ml-3 text-[9px] font-mono text-[#B4C0CF]">Loading {selectedEntity} profile...</span>
                    </div>
                  ) : (entityDetail || entityHoldings) ? (
                    <div>
                      {/* Header */}
                      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3"
                        style={{ borderBottom: '1px solid rgba(214,226,242,0.18)', background: 'linear-gradient(180deg, rgba(14,165,200,0.08), transparent)' }}>
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-mono font-black text-white">{entityDetail?.entity?.name || entityHoldings?.entity || selectedEntity}</h3>
                          {entityHoldings?.category && (
                            <span className="text-[8px] font-mono px-1.5 py-px tracking-wider"
                              style={{ color: '#7DD3FC', background: 'rgba(14,165,200,0.15)', border: '1px solid rgba(14,165,200,0.42)', borderRadius: 0 }}>
                              {entityHoldings.category.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {entityHoldings?.portfolio && entityHoldings.portfolio.total_usd > 0 && (
                            <div className="text-right">
                              <div className="text-[9px] font-mono text-[#B4C0CF] tracking-wider">PORTFOLIO</div>
                              <div className="text-base font-mono font-black text-white tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatUSD(entityHoldings.portfolio.total_usd)}</div>
                            </div>
                          )}
                          <button onClick={() => { setSelectedEntity(null); setEntityDetail(null); setEntityHoldings(null); }}
                            className="text-[#9EACBF] hover:text-white transition-colors text-xs font-mono">✕</button>
                        </div>
                      </div>

                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-0 px-5 py-4" style={{ borderBottom: '1px solid rgba(214,226,242,0.12)' }}>
                        {[
                          { label: 'RECEIVED', value: formatUSD(entityDetail?.stats?.total_received || 0), color: '#34E7FF' },
                          { label: 'SENT', value: formatUSD(entityDetail?.stats?.total_sent || 0), color: '#0EA5C8' },
                          { label: 'NET', value: `${(entityDetail?.stats?.net_flow || 0) >= 0 ? '+' : '-'}${formatUSD(Math.abs(entityDetail?.stats?.net_flow || 0))}`, color: (entityDetail?.stats?.net_flow || 0) >= 0 ? '#3DFF9E' : '#FF6B7A' },
                        ].map(s => (
                          <div key={s.label} className="py-1">
                            <div className="text-[8px] font-mono text-[#B4C0CF] tracking-wider mb-0.5">{s.label}</div>
                            <div className="text-[12px] font-mono font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace", color: s.color }}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Portfolio Breakdown */}
                      {entityHoldings?.holdings_by_chain && Object.keys(entityHoldings.holdings_by_chain).length > 0 && (
                        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(214,226,242,0.12)' }}>
                          <div className="text-[9px] font-mono text-[#0EA5C8] tracking-wider font-bold mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            ◈ ALLOCATION
                          </div>
                          {/* Allocation bar */}
                          <div className="mb-3">
                            <div className="flex h-2.5 overflow-hidden gap-px">
                              {Object.entries(entityHoldings.holdings_by_chain)
                                .sort(([,a], [,b]) => b.balance_usd - a.balance_usd)
                                .map(([chain, data]) => {
                                  const pct = entityHoldings.portfolio.total_usd > 0
                                    ? Math.max((data.balance_usd / entityHoldings.portfolio.total_usd) * 100, 2)
                                    : 0;
                                  return (
                                    <motion.div
                                      key={chain}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 0.7, ease: 'easeOut' }}
                                      className="h-full relative group cursor-default"
                                      style={{ background: chainColor(chain), minWidth: '6px' }}
                                      title={`${chain}: ${formatUSD(data.balance_usd)}`}
                                    />
                                  );
                                })}
                            </div>
                          </div>
                          {/* Holdings list */}
                          <div className="space-y-1.5">
                            {Object.entries(entityHoldings.holdings_by_chain)
                              .sort(([,a], [,b]) => b.balance_usd - a.balance_usd)
                              .map(([chain, data]) => (
                                <div key={chain} className="flex items-center justify-between py-1.5"
                                  style={{ borderBottom: '0.5px solid rgba(214,226,242,0.10)' }}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px]" style={{ color: chainColor(chain) }}>{chainIcon(chain)}</span>
                                    <span className="text-[9px] font-mono font-bold" style={{ color: chainColor(chain) }}>{data.token}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-mono text-[#B4C0CF]">
                                      {data.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })} {data.token}
                                    </span>
                                    <span className="text-[10px] font-mono font-black text-white tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                      {formatUSD(data.balance_usd)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Recent Activity */}
                      {entityHoldings?.recent_transactions && entityHoldings.recent_transactions.length > 0 && (
                        <div className="px-5 py-4">
                          <div className="text-[9px] font-mono text-[#0EA5C8] tracking-wider font-bold mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            ▸ RECENT MOVEMENTS
                          </div>
                          <div className="space-y-1.5 max-h-[260px] overflow-y-auto tracking-scroll">
                            {entityHoldings.recent_transactions.slice(0, 8).map((tx, i) => {
                              const isBuy = tx.action === 'Bought / Received';
                              const actionColor = isBuy ? '#34E7FF' : '#0EA5C8';
                              return (
                                <div key={i} className="flex items-center gap-2 py-2"
                                  style={{ borderBottom: '0.5px solid rgba(214,226,242,0.09)' }}>
                                  <span className="text-[8px]" style={{ color: chainColor(tx.blockchain) }}>{chainIcon(tx.blockchain)}</span>
                                  <span className="text-[8px] font-mono font-bold px-1 py-px"
                                    style={{ color: actionColor, background: actionColor + '10', border: `0.5px solid ${actionColor}25`, borderRadius: 0 }}>
                                    {isBuy ? 'IN' : 'OUT'}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-white tabular-nums flex-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatUSD(tx.amount_usd)}</span>
                                  <span className="text-[8px] font-mono text-[#B4C0CF]">{formatAge(tx.timestamp)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <div className="text-[#B4C0CF] font-sans text-xs">No data available for this entity yet</div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Entity Leaderboard */}
            <div className="panel-glass overflow-hidden">
              <div className="accent-bar-tracking" />
              <div className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: '1px solid rgba(214,226,242,0.14)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#0EA5C8] font-bold tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>◈ LEADERBOARD</span>
                  <span className="text-[9px] font-mono text-[#B4C0CF]">
                    {holdingsLeaderboard.length > 0
                      ? `${formatUSD(holdingsStats.total_value_tracked)} tracked`
                      : 'On-chain activity'}
                  </span>
                </div>
              </div>

              {(isLoadingEntities || isLoadingHoldings) ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-3 items-center" style={{ animation: `data-in 0.3s ease ${i * 0.05}s both` }}>
                      <div className="h-2.5 w-4 rounded-sm bg-[#0D0D0F]" />
                      <div className="h-2.5 w-16 rounded-sm bg-[#0A0A0C]" />
                      <div className="h-2.5 w-12 rounded-sm bg-[#0D0D0F]" />
                      <div className="h-2.5 w-14 rounded-sm bg-[#0A0A0C]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(214,226,242,0.14)' }}>
                        {['#', 'ENTITY', 'CATEGORY', 'PORTFOLIO', 'VOLUME'].map(col => (
                          <th key={col} className="px-2.5 py-2 text-left text-[9px] font-mono tracking-[0.14em]"
                            style={{ color: 'rgba(125,211,252,0.92)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const merged = mergedLeaderboard.slice(0, 5);
                        if (merged.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="text-center py-6">
                                <div className="text-[#B4C0CF] font-sans text-xs">No entities found</div>
                              </td>
                            </tr>
                          );
                        }
                        return merged.map((ent, i) => {
                          const featured = FEATURED_ENTITIES.find(f => f.name === ent.entity);
                          const entColor = featured?.color || '#0EA5C8';
                          const displayCategory = formatCategory(ent.category);
                          return (
                            <tr
                              key={ent.entity}
                              onClick={() => handleEntityClick(ent.entity)}
                              className="tx-row cursor-pointer"
                              style={{
                                borderBottom: '0.5px solid rgba(214,226,242,0.10)',
                                background: selectedEntity === ent.entity ? 'rgba(14,165,200,0.10)' : undefined,
                              }}
                            >
                              <td className="px-2.5 py-1.5">
                                <span className="text-[10px] font-mono text-[#B4C0CF] tabular-nums">{i + 1}</span>
                              </td>
                              <td className="px-2.5 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  {featured && <span className="text-[12px]" style={{ color: entColor }}>{featured.icon}</span>}
                                  <div>
                                    <div className="text-[10px] font-mono font-bold text-white">{ent.entity}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2.5 py-1.5">
                                {displayCategory && (
                                  <span className="text-[8px] font-mono" style={{ color: entColor, opacity: 0.95 }}>
                                    {displayCategory}
                                  </span>
                                )}
                              </td>
                              <td className="px-2.5 py-1.5">
                                <span className="text-[10px] font-mono font-black text-white tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                  {ent.portfolio > 0 ? formatUSD(ent.portfolio) : '\u2014'}
                                </span>
                              </td>
                              <td className="px-2.5 py-1.5">
                                <span className="text-[9px] font-mono text-[#D5DDE8] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                  {ent.volume > 0 ? formatUSD(ent.volume) : '\u2014'}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Market Makers Panel */}
            {makersLeaderboard.length > 0 && (
              <div className="panel-glass overflow-hidden mt-5">
                <div className="accent-bar-tracking" />
                <div className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderBottom: '1px solid rgba(214,226,242,0.14)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#9BAEFF] font-bold tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>◈ MARKET MAKERS</span>
                    <span className="text-[9px] font-mono text-[#B4C0CF]">
                      Tracked OTC desks &amp; trading firms
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(214,226,242,0.14)' }}>
                        {['#', 'ENTITY', 'CATEGORY', 'PORTFOLIO', 'VOLUME'].map(col => (
                          <th key={col} className="px-2.5 py-2 text-left text-[9px] font-mono tracking-[0.14em]"
                            style={{ color: 'rgba(125,211,252,0.92)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {makersLeaderboard.map((ent, i) => {
                        const featured = FEATURED_ENTITIES.find(f => f.name === ent.entity);
                        const entColor = featured?.color || '#9BAEFF';
                        const displayCategory = formatCategory(ent.category);
                        return (
                          <tr
                            key={ent.entity}
                            onClick={() => handleEntityClick(ent.entity)}
                            className="tx-row cursor-pointer"
                            style={{
                              borderBottom: '0.5px solid rgba(214,226,242,0.10)',
                              background: selectedEntity === ent.entity ? 'rgba(155,174,255,0.10)' : undefined,
                            }}
                          >
                            <td className="px-2.5 py-1.5">
                              <span className="text-[10px] font-mono text-[#B4C0CF] tabular-nums">{i + 1}</span>
                            </td>
                            <td className="px-2.5 py-1.5">
                              <div className="flex items-center gap-1.5">
                                {featured && <span className="text-[12px]" style={{ color: entColor }}>{featured.icon}</span>}
                                <div>
                                  <div className="text-[10px] font-mono font-bold text-white">{ent.entity}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-2.5 py-1.5">
                              {displayCategory && (
                                <span className="text-[8px] font-mono" style={{ color: entColor, opacity: 0.95 }}>
                                  {displayCategory}
                                </span>
                              )}
                            </td>
                            <td className="px-2.5 py-1.5">
                              <span className="text-[10px] font-mono font-black text-white tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {ent.portfolio > 0 ? formatUSD(ent.portfolio) : '\u2014'}
                              </span>
                            </td>
                            <td className="px-2.5 py-1.5">
                              <span className="text-[9px] font-mono text-[#D5DDE8] tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                {ent.volume > 0 ? formatUSD(ent.volume) : '\u2014'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>

        </div>
        )}
        </div>

      </TerminalModulePageShell>

      <FooterTerminal />
    </div>
  );
}

export default TrackingContent;
