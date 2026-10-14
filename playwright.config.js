import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 45000, workers: 1,
  use: { baseURL:'http://127.0.0.1:4173', viewport:{width:390,height:844}, trace:'retain-on-failure' },
  webServer: { command:'npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:true },
});
