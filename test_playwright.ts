import { chromium } from "playwright";
async function test() {
  console.log("Launching headless chromium...");
  const b1 = await chromium.launch({ headless: true });
  console.log("Headless launched successfully!");
  await b1.close();

  console.log("Launching headed chromium...");
  try {
    const b2 = await chromium.launch({ headless: false });
    console.log("Headed launched successfully!");
    await b2.close();
  } catch (error: unknown) {
    console.log(
      "Headed failed:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
test();
