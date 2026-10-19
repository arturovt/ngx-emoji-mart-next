import { ApplicationConfig } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';

// Hydration must be provided on both the browser and the server, since `provideClientHydration`
// also makes the server annotate the HTML it sends. The zone vs zoneless choice differs between
// them instead, and lives in main.ts and app.config.server.ts.
export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration()],
};
