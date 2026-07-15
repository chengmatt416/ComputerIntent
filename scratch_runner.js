import { PlaywrightComputerUseSession } from "./apps/mcp-server/dist/index.js";
import readline from "node:readline";

async function main() {
  const session = new PlaywrightComputerUseSession({ headless: false });
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on("line", async (line) => {
    try {
      const req = JSON.parse(line);
      if (req.command === "start") {
        const result = await session.start(req.url);
        console.log(JSON.stringify({ success: true, result }));
      } else if (req.command === "observe") {
        const result = await session.observe();
        console.log(JSON.stringify({ success: true, result }));
      } else if (req.command === "act") {
        const result = await session.act(req.action, req.approval);
        console.log(JSON.stringify({ success: true, result }));
      } else if (req.command === "close") {
        await session.close();
        console.log(JSON.stringify({ success: true, closed: true }));
        process.exit(0);
      } else {
        console.log(
          JSON.stringify({
            success: false,
            error: "Unknown command: " + req.command,
          }),
        );
      }
    } catch (err) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    }
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
