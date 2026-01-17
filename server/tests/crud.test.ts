import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

const setup = () => createApp({ dbPath: ":memory:" });

describe("basic CRUD", () => {
  it("creates category and phrase", async () => {
    const { app } = setup();

    const categoryRes = await request(app).post("/api/categories").send({ name: "People" }).expect(201);
    const categoryId = categoryRes.body.id;

    const phraseRes = await request(app)
      .post("/api/phrases")
      .send({ categoryId, textEn: "a thoughtful portrait" })
      .expect(201);

    expect(phraseRes.body.categoryId).toBe(categoryId);

    const listRes = await request(app).get(`/api/phrases?categoryId=${categoryId}`).expect(200);
    expect(listRes.body.length).toBe(1);
  });
});
