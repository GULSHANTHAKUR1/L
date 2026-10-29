/**
 * Master Backend Test Runner for HETEROHMS (Prompt 18)
 *
 * Runs all unit and security test suites sequentially:
 * 1. Authentication & RBAC Suite (11 tests)
 * 2. Appointments & Clinical Records Suite (8 tests)
 * 3. Medical Document Security & Upload Suite (5 tests)
 * 4. Semantic Search Security & Isolation Suite (8 tests)
 * 5. OCR Microservice Integration & Webhook Suite (5 tests)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testSuites = [
  { name: '1. Authentication & RBAC', file: 'auth_rbac.test.js' },
  { name: '2. Appointments & Clinical Records', file: 'appointment_records.test.js' },
  { name: '3. Medical Document Security & Storage', file: 'document_security.test.js' },
  { name: '4. Semantic Search Security & RBAC', file: 'search_security.test.js' },
  { name: '5. OCR Integration & Webhook Callbacks', file: 'ocr_integration_test.js' },
];

const runSuite = (suite) => {
  return new Promise((resolve) => {
    const suitePath = path.join(__dirname, suite.file);
    const child = spawn('node', [suitePath], { stdio: 'inherit' });

    child.on('close', (code) => {
      resolve({ name: suite.name, passed: code === 0, code });
    });
  });
};

const runAll = async () => {
  console.log('\n=============================================================');
  console.log('🏥 HETEROHMS BACKEND MASTER TEST RUNNER (Node.js ES Modules)');
  console.log('=============================================================\n');

  const results = [];
  let totalFailures = 0;

  for (const suite of testSuites) {
    const result = await runSuite(suite);
    results.push(result);
    if (!result.passed) totalFailures++;
  }

  console.log('\n=============================================================');
  console.log('📊 MASTER TEST EXECUTION SCORECARD');
  console.log('=============================================================');

  results.forEach((r) => {
    const statusIcon = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`  ${statusIcon} ${r.name}`);
  });

  console.log('=============================================================');
  if (totalFailures === 0) {
    console.log(`🎉 ALL ${testSuites.length} SUITES PASSED! System security & integrity verified.`);
    console.log('=============================================================\n');
    process.exit(0);
  } else {
    console.error(`❌ ${totalFailures} SUITE(S) FAILED. Please review error logs above.`);
    console.log('=============================================================\n');
    process.exit(1);
  }
};

runAll();
