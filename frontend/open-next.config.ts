import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

// ISR/SSG output is cached in R2 so every colo reads the same rendered pages
// instead of re-rendering per isolate.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
