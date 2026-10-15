import "./bootstrap-env";
import { afterAll } from "vitest";
import { testDb } from "./helpers";

afterAll(async () => {
  await testDb.$disconnect();
});
