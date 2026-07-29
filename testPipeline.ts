import { runImagePipelineManualTest } from './src/utils/testPipeline';

console.log("=== LAUNCHING QA CHECKLIST MANUAL TEST SUITE ===");

runImagePipelineManualTest()
  .then(({ results, overallPassed }) => {
    console.log("\n=== FINAL MANUAL QA RESULTS SUMMARY ===");
    results.forEach((r) => {
      console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.step}`);
      console.log(`       Details: ${r.details}`);
    });
    console.log(`\nOVERALL SUITE STATUS: ${overallPassed ? 'ALL PASSED' : 'FAILED'}`);
    if (!overallPassed) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("QA Test execution error:", err);
    process.exit(1);
  });
