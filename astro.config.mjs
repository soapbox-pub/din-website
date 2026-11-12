import { defineConfig } from "astro/config";

// Published as an nsite (NIP-5A): static files only. Gateways resolve
// `/download/` to `/download/index.html` and fall back to `/404.html`, so every page
// is a directory with an index and every link ends in a slash.
export default defineConfig({
  site: "https://din.computer",
  trailingSlash: "always",
  build: {
    format: "directory",
    assets: "assets",
  },
  image: {
    responsiveStyles: true,
  },
  devToolbar: { enabled: false },
});
