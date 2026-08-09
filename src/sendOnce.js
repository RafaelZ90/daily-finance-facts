import { sendDailyFact } from "./sendDaily.js";

const dryRun = process.argv.includes("--dry-run");

try {
  await sendDailyFact({ dryRun });
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
