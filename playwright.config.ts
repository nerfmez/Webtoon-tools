import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  webServer:{command:'npm run dev -- --host 127.0.0.1',url:'http://127.0.0.1:5173/Webtoon-tools/',reuseExistingServer:true},
  use:{baseURL:'http://127.0.0.1:5173/Webtoon-tools/'},
  projects:[{name:'iPad Safari',use:{...devices['iPad Pro 11']}}],
});
