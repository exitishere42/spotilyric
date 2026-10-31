import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@api/UserSettings": path.resolve(__dirname, "tests/mocks/vencordMocks.ts"),
      "@api/Settings": path.resolve(__dirname, "tests/mocks/vencordMocks.ts"),
      "@utils/types": path.resolve(__dirname, "tests/mocks/vencordMocks.ts"),
      "@webpack/common": path.resolve(__dirname, "tests/mocks/vencordMocks.ts"),
      "@webpack": path.resolve(__dirname, "tests/mocks/vencordMocks.ts"),
      "@vencord/discord-types/enums": path.resolve(__dirname, "tests/mocks/vencordMocks.ts"),
      "@vencord/discord-types": path.resolve(__dirname, "tests/mocks/vencordMocks.ts"),
    },
  },
});
