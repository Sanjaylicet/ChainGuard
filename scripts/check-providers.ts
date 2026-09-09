import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GraphQLClient, gql } from 'graphql-request';

// ============================================================
// Safety verification
// ============================================================
export function verifyEnvironmentSafety() {
  const demoOnly = process.env.DEMO_ONLY_TESTNET;
  if (demoOnly !== 'true') {
    throw new Error('FATAL: DEMO_ONLY_TESTNET must be "true". Refusing to continue.');
  }
  const guards = [process.env.GRAPH_NETWORK, process.env.HEDERA_NETWORK];
  for (const v of guards) {
    if (v && v.toLowerCase().includes('mainnet')) {
      throw new Error(`FATAL: Mainnet configuration detected ("${v}"). Refusing to continue.`);
    }
  }
  console.log('✅ Environment Safety Verified: DEMO_ONLY_TESTNET=true, network=testnet');
}

// ============================================================
// Hedera testnet check
// ============================================================
async function checkHederaTestnet() {
  console.log('\n--- Checking Hedera Testnet Configuration ---');
  const payerIdStr = process.env.HEDERA_PAYER_ACCOUNT_ID;
  const payerKeyStr = process.env.HEDERA_PAYER_PRIVATE_KEY;
  const receiverIdStr = process.env.HEDERA_RECEIVER_ACCOUNT_ID;

  if (!payerIdStr || payerIdStr.includes('REPLACE_ME') || !payerKeyStr || payerKeyStr.includes('REPLACE_ME')) {
    console.log('⚠️  Hedera credentials are placeholder — need real testnet accounts in .env');
    console.log('   Payer:    ', payerIdStr || 'MISSING');
    console.log('   Receiver: ', receiverIdStr || 'MISSING');
    console.log('   Get free testnet accounts at: https://portal.hedera.com');
    return { ok: false, reason: 'Credentials not configured' };
  }

  try {
    const { Client, AccountId, AccountBalanceQuery, PrivateKey } = await import('@hashgraph/sdk');
    const client = Client.forTestnet();
    const payerId = AccountId.fromString(payerIdStr);
    const key = PrivateKey.fromString(payerKeyStr);
    client.setOperator(payerId, key);

    const balance = await new AccountBalanceQuery()
      .setAccountId(payerId)
      .execute(client);

    console.log(`✅ Hedera Payer: ${payerId.toString()} — Balance: ${balance.hbars.toString()}`);
    console.log(`   Receiver: ${receiverIdStr}`);
    client.close();
    return { ok: true, balance: balance.hbars.toString() };
  } catch (err: any) {
    console.error('❌ Hedera check failed:', err?.message);
    return { ok: false, error: err?.message };
  }
}

// ============================================================
// The Graph provider check
// ============================================================
async function checkTheGraphProvider() {
  console.log('\n--- Checking The Graph Provider ---');

  const endpointsToTry = [
    process.env.GRAPH_API_URL,
    'https://api.studio.thegraph.com/query/48427/uniswap-v3-arbitrum-sepolia/version/latest',
  ].filter((u): u is string => Boolean(u && !u.includes('YOUR_GRAPH_PROVIDER_ENDPOINT')));

  const sampleQuery = gql`
    query CheckActivity {
      tokens(first: 5, orderBy: txCount, orderDirection: desc) {
        id
        symbol
        name
        txCount
      }
    }
  `;

  let lastError: any = null;
  for (const endpoint of endpointsToTry) {
    try {
      console.log(`ℹ️  Testing: ${endpoint}`);
      const client = new GraphQLClient(endpoint);
      const data: any = await client.request(sampleQuery);
      const count = data?.tokens?.length ?? 0;
      console.log(`✅ The Graph Live Query Successful! Received ${count} token records.`);

      const fixturesDir = path.resolve(process.cwd(), 'docs', 'fixtures');
      fs.mkdirSync(fixturesDir, { recursive: true });
      fs.writeFileSync(
        path.join(fixturesDir, 'sample-graph-response.json'),
        JSON.stringify(data || {}, null, 2),
        'utf-8'
      );
      return { ok: true, endpoint, recordCount: count };
    } catch (err: any) {
      console.warn(`⚠️  Failed for ${endpoint}: ${err?.message}`);
      lastError = err;
    }
  }

  console.error('❌ All Graph queries failed:', lastError?.message);
  return { ok: false, error: lastError?.message };
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('🚀 ChainGuard Lite — Provider Verification\n');
  verifyEnvironmentSafety();

  const hederaResult = await checkHederaTestnet();
  const graphResult = await checkTheGraphProvider();

  console.log('\n======== Provider Check Summary ========');
  console.log(`Hedera Testnet: ${hederaResult.ok ? '✅ OPERATIONAL' : '⚠️  ACTION REQUIRED'}`);
  console.log(`The Graph:      ${graphResult.ok ? '✅ OPERATIONAL' : '❌ FAILED'}`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Fatal:', err?.message || err);
  process.exit(1);
});
