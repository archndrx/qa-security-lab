import "dotenv/config";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",

  reporter: [
    ["list"],
    ["allure-playwright"],
  ],

  use: {
    baseURL: "http://localhost:3000",
  },
});