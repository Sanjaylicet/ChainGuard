import 'dotenv/config';
import { GraphQLClient, gql } from 'graphql-request';
import { z } from 'zod';
import type { NormalizedEvidence } from '../shared/types';

// ============================================================
// Address validation
// ============================================================
const EVM_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

export function isValidEvmAddress(address: string): boolean {
  return EVM_ADDRESS_REGEX.test(address);
}

// ============================================================
// Graph client setup
// ============================================================
function getGraphClient(): GraphQLClient {
  const url =
    process.env.GRAPH_API_URL ||
    'https://api.studio.thegraph.com/query/48427/uniswap-v3-arbitrum-sepolia/version/latest';
  const client = new GraphQLClient(url, {
    headers: process.env.GRAPH_API_KEY
      ? { Authorization: `Bearer ${process.env.GRAPH_API_KEY}` }
      : {},
  });
  return client;
}

// ============================================================
// Live Graph query — address-level activity
// We query Uniswap V3 swap/pool data to find activity around
// an address (as a participant in pools or swaps).
// ============================================================
const ADDRESS_ACTIVITY_QUERY = gql`
  query AddressActivity($address: String!) {
    swaps(
      where: { origin: $address }
      first: 100
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      timestamp
      origin
      recipient
      token0 {
        id
        symbol
      }
      token1 {
        id
        symbol
      }
      amountUSD
    }
    deposits: mints(
      where: { origin: $address }
      first: 50
    ) {
      id
      timestamp
      origin
    }
    withdrawals: burns(
      where: { origin: $address }
      first: 50
    ) {
      id
      timestamp
      origin
    }
  }
`;

// Fallback: simpler query when address-based filter isn't supported
const SIMPLE_TOKEN_QUERY = gql`
  query SimpleActivityCheck {
    tokens(first: 20, orderBy: txCount, orderDirection: desc) {
      id
      symbol
      name
      txCount
      poolCount
    }
    pools(first: 5, orderBy: txCount, orderDirection: desc) {
      id
      txCount
      token0 { symbol }
      token1 { symbol }
      createdAtTimestamp
    }
  }
`;

// ============================================================
// Response schema validation
// ============================================================
const SwapSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  origin: z.string().optional(),
  recipient: z.string().optional(),
  token0: z.object({ id: z.string(), symbol: z.string() }).optional(),
  token1: z.object({ id: z.string(), symbol: z.string() }).optional(),
  amountUSD: z.string().optional(),
});

const ActivityResponseSchema = z.object({
  swaps: z.array(SwapSchema).optional().default([]),
  deposits: z.array(z.object({ id: z.string(), timestamp: z.string(), origin: z.string().optional() })).optional().default([]),
  withdrawals: z.array(z.object({ id: z.string(), timestamp: z.string(), origin: z.string().optional() })).optional().default([]),
});

// ============================================================
// Main export: queryAddressActivity
// ============================================================
export async function queryAddressActivity(
  address: string
): Promise<NormalizedEvidence> {
  if (!isValidEvmAddress(address)) {
    throw new Error(`Invalid EVM address: ${address}`);
  }

  const queriedAt = new Date().toISOString();
  const client = getGraphClient();

  // Enforce 10 second timeout
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Graph provider request timed out after 10s')), 10_000)
  );

  try {
    // Try address-specific query first
    let raw: unknown;
    let usedFallback = false;
    try {
      raw = await Promise.race([
        client.request(ADDRESS_ACTIVITY_QUERY, { address: address.toLowerCase() }),
        timeoutPromise,
      ]);
    } catch (queryErr: any) {
      // If the address-level query fails (schema mismatch, no data), fallback to simple query
      console.warn('[graph-client] Address query failed, using simple fallback query:', queryErr?.message);
      usedFallback = true;
      raw = await Promise.race([
        client.request(SIMPLE_TOKEN_QUERY),
        timeoutPromise,
      ]);
    }

    const parsed = ActivityResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn('[graph-client] Response validation warning:', parsed.error.message);
    }

    const data = parsed.success ? parsed.data : { swaps: [], deposits: [], withdrawals: [] };
  return normalizeEvidence(address, data, queriedAt, !usedFallback && parsed.success);
  } catch (err: any) {
    if (err?.message?.includes('timed out')) {
      throw new Error('Graph provider request timed out. Please try again.');
    }
    // Return minimal evidence with dataComplete=false rather than crashing
    console.error('[graph-client] Provider error:', err?.message);
    return {
      address,
      eventCount: 0,
      uniqueCounterparties: 0,
      recentEventCount: 0,
      firstSeen: null,
      lastSeen: null,
      protocolInteractions: 0,
      dataComplete: false,
      source: 'The Graph',
      queriedAt,
    };
  }
}

// ============================================================
// Evidence normalization
// ============================================================
function normalizeEvidence(
  address: string,
  data: { swaps: any[]; deposits: any[]; withdrawals: any[] },
  queriedAt: string,
  dataComplete: boolean
): NormalizedEvidence {
  const allEvents = [
    ...(data.swaps || []),
    ...(data.deposits || []),
    ...(data.withdrawals || []),
  ];

  const eventCount = allEvents.length;

  // Collect unique counterparties from swap recipients
  const counterpartySet = new Set<string>();
  for (const swap of data.swaps || []) {
    if (swap.recipient && swap.recipient.toLowerCase() !== address.toLowerCase()) {
      counterpartySet.add(swap.recipient.toLowerCase());
    }
  }
  const uniqueCounterparties = counterpartySet.size;

  // Recent events = last 7 days
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const recentEventCount = allEvents.filter((e) => {
    const ts = parseInt(e.timestamp || '0', 10);
    return ts >= sevenDaysAgo;
  }).length;

  // First/last seen
  const timestamps = allEvents
    .map((e) => parseInt(e.timestamp || '0', 10))
    .filter((t) => t > 0)
    .sort((a, b) => a - b);

  const firstSeen =
    timestamps.length > 0
      ? new Date(timestamps[0] * 1000).toISOString()
      : null;
  const lastSeen =
    timestamps.length > 0
      ? new Date(timestamps[timestamps.length - 1] * 1000).toISOString()
      : null;

  // Protocol interactions = unique pools/tokens touched
  const protocolSet = new Set<string>();
  for (const swap of data.swaps || []) {
    if (swap.token0?.id) protocolSet.add(swap.token0.id);
    if (swap.token1?.id) protocolSet.add(swap.token1.id);
  }
  const protocolInteractions = protocolSet.size;

  return {
    address,
    eventCount,
    uniqueCounterparties,
    recentEventCount,
    firstSeen,
    lastSeen,
    protocolInteractions,
    dataComplete,
    source: 'The Graph',
    queriedAt,
  };
}
