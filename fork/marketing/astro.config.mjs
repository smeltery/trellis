import { defineConfig } from "astro/config";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: Number(process.env.PORT ?? 4173),
  },
});
