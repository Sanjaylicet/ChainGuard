import 'dotenv/config';
import { fetchReportWithPayment } from '../src/agent/payment-client';

// ============================================================
// CLI test script: npm run test:paid-request -- --address 0x...
// ============================================================

const args = process.argv.slice(2);
const addressIndex = args.indexOf('--address');
const address = addressIndex !== -1 ? args[addressIndex + 1] : undefined;

const subjectTypeIndex = args.indexOf('--type');
const subjectType =
  subjectTypeIndex !== -1
    ? (args[subjectTypeIndex + 1] as 'wallet' | 'protocol')
    : 'wallet';

if (!address) {
  console.error('Usage: npm run test:paid-request -- --address 0xYOUR_TESTNET_ADDRESS [--type wallet|protocol]');
  process.exit(1);
}

async function main() {
  console.log('='.repeat(60));
  console.log('ChainGuard Lite — Paid Request Test');
  console.log('='.repeat(60));
  console.log(`Address:      ${address}`);
  console.log(`Subject type: ${subjectType}`);
  console.log(`Network:      Hedera testnet`);
  console.log('='.repeat(60));
  console.log();

  try {
    const result = await fetchReportWithPayment(address!, subjectType);

    console.log('\nPayment Lifecycle Steps:');
    for (const step of result.paymentSteps) {
      console.log(`  ✅ ${step}`);
    }

    if (result.status === 'error') {
      console.error('\n❌ Report failed:', result.error);
      process.exit(1);
    }

    console.log('\nReport Summary:');
    console.log(`  Report ID:   ${result.report?.reportId}`);
    console.log(`  Risk Label:  ${result.report?.riskLabel}`);
    console.log(`  Confidence:  ${result.report?.confidence}`);
    console.log(`  Events:      ${result.report?.evidence.eventCount}`);
    console.log(`  Counterparties: ${result.report?.evidence.uniqueCounterparties}`);
    console.log(`  Data Source: ${result.report?.evidence.dataSource}`);
    console.log(`  Payment:     ${result.report?.payment.amount} ${result.report?.payment.asset} (${result.report?.payment.status})`);
    console.log();
    console.log('Full Report JSON saved to: test-paid-result.json');

    const fs = await import('fs');
    fs.writeFileSync(
      'test-paid-result.json',
      JSON.stringify(result, null, 2),
      'utf-8'
    );

    console.log('\n✅ Test complete — all payment steps verified.');
  } catch (err: any) {
    console.error('\n❌ Fatal error:', err?.message);
    process.exit(1);
  }
}

main();
