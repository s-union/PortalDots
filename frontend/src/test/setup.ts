/**
 * Test setup: Load the Temporal polyfill synchronously before any tests run.
 * This mirrors how main.ts initializes Temporal at app startup, ensuring
 * datetime utilities work correctly in the test environment.
 */
import 'temporal-polyfill-lite/global'
