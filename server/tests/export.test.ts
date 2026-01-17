import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/app.js";

const setup = () => createApp({ dbPath: ":memory:" });

describe("export writes file", () => {
  it("writes prompt to file", async () => {
    const { app } = setup();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "prompt-manager-"));
    const outputPath = path.join(tempDir, "prompt.txt");

    await request(app).put("/api/settings").send({ promptOutputPath: outputPath });

    const res = await request(app)
      .post("/api/export")
      .send({ tokens: ["a beautiful girl", "sitting", "in a park"] })
      .expect(200);

    const content = await fs.readFile(outputPath, "utf8");
    expect(content).toBe("a beautiful girl sitting in a park");
    expect(res.body.ok).toBe(true);
  });
});
