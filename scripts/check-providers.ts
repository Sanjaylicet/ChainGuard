import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GraphQLClient, gql } from 'graphql-request';
import { Client, AccountBalanceQuery, AccountId, PrivateKey } from '@hashgraph/sdk';

export function verifyEnvironmentSafety() {
  const demoOnly = process.env.DEMO_ONLY_TESTNET;
  if (demoOnly !== 'true') {
    throw new Error('FATAL: Application must refuse to start unless DEMO_ONLY_TESTNET=true');
  }

  const graphNetwork = process.env.GRAPH_NETWORK || '';
  const hederaNetwork = process.env.HEDERA_NETWORK || '';

  if (graphNetwork.toLowerCase().includes('mainnet') || hederaNetwork.toLowerCase().includes('mainnet')) {
    throw new Error('FATAL: Mainnet configuration rejected! ChainGuard Lite is testnet-only.');
  }

  console.log('✅ Environment Safety Verified: DEMO_ONLY_TESTNET=true, Network=testnet');
}

async function checkHederaTestnet() {
  console.log('\n--- Checking Hedera Testnet Configuration ---');
  const payerIdStr = process.env.HEDERA_PAYER_ACCOUNT_ID;
  const payerKeyStr = process.env.HEDERA_PAYER_PRIVATE_KEY;
  const receiverIdStr = process.env.HEDERA_RECEIVER_ACCOUNT_ID;

  if (!payerIdStr || payerIdStr.includes('REPLACE_ME') || !payerKeyStr || payerKeyStr.includes('REPLACE_ME')) {
    console.log('⚠️  Hedera credentials incomplete or set to placeholder in .env');
    console.log('   Payer Account:', payerIdStr || 'MISSING');
    console.log('   Receiver Account:', receiverIdStr || 'MISSING');
    return { ok: false, reason: 'Credentials not configured' };
  }

  try {
    const client = Client.forTestnet();
    const payerId = AccountId.fromString(payerIdStr);
    const payerKey = PrivateKey.fromString(payerKeyStr);
    client.setOperator(payerId, payerKey);

    const balance = await new AccountBalanceQuery()
      .setAccountId(payerId)
      .execute(client);

    console.log(`✅ Hedera Payer Account: ${payerId.toString()}`);
    console.log(`   Balance: ${balance.hbars.toString()}`);
    console.log(`   Receiver Account: ${receiverIdStr}`);
    client.close();
    return { ok: true, balance: balance.hbars.toString() };
  } catch (error: any) {
    console.error('❌ Hedera Testnet Check Failed:', error?.message || error);
    return { ok: false, error: error?.message || error };
  }
}

async function checkTheGraphProvider() {
  console.log('\n--- Checking The Graph Provider ---');
  
  const endpointsToTry = [
    process.env.GRAPH_API_URL,
    'https://api.studio.thegraph.com/query/48427/uniswap-v3-arbitrum-sepolia/version/latest',
    'https://gateway.thegraph.com/api/subgraphs/name/uniswap/uniswap-v3'
  ].filter((url): url is string => Boolean(url && !url.includes('YOUR_GRAPH_PROVIDER_ENDPOINT')));

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
      console.log(`ℹ️  Testing Graph endpoint: ${endpoint}`);
      const client = new GraphQLClient(endpoint);
      const data: any = await client.request(sampleQuery);
      
      const recordCount = data?.tokens?.length || 0;
      console.log('✅ The Graph Live Query Successful!');
      console.log(`   Retrieved ${recordCount} indexed token records.`);

      // Save fixture for debugging
      const fixturesDir = path.resolve(process.cwd(), 'docs', 'fixtures');
      if (!fs.existsSync(fixturesDir)) {
        fs.mkdirSync(fixturesDir, { recursive: true });
      }
      const fixturePath = path.join(fixturesDir, 'sample-graph-response.json');
      fs.writeFileSync(fixturePath, JSON.stringify(data || {}, null, 2), 'utf-8');
      console.log(`   Saved sample fixture to: ${fixturePath}`);

      return { ok: true, endpoint, recordCount };
    } catch (error: any) {
      console.log(`⚠️  Endpoint query failed for ${endpoint}: ${error?.message || error}`);
      lastError = error;
    }
  }

  console.error('❌ All Graph Queries Failed:', lastError?.message || lastError);
  return { ok: false, error: lastError?.message || lastError };
}

async function main() {
  console.log('🚀 Running ChainGuard Lite Provider Verification...');
  verifyEnvironmentSafety();

  const hederaResult = await checkHederaTestnet();
  const graphResult = await checkTheGraphProvider();

  console.log('\n================ Provider Check Summary ================');
  console.log(`Hedera Testnet: ${hederaResult.ok ? '✅ OPERATIONAL' : '⚠️  ACTION REQUIRED (Please set HEDERA keys in .env)'}`);
  console.log(`The Graph:      ${graphResult.ok ? '✅ OPERATIONAL' : '❌ FAILED'}`);
  console.log('========================================================\n');
}

main().catch((err) => {
  console.error('Fatal Provider Check Error:', err);
  process.exit(1);
});
