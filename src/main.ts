import { provideZoneChangeDetection, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';

// The e2e tests set this flag to run the app without `zone.js`.
const zoneless = !!(window as { __zoneless?: boolean }).__zoneless;

async function bootstrap() {
  if (!zoneless) {
    // `zone.js` has to be loaded before Angular starts.
    await import('zone.js');
  }

  await bootstrapApplication(AppComponent, {
    providers: [zoneless ? provideZonelessChangeDetection() : provideZoneChangeDetection()],
  });
}

bootstrap().catch(error => console.error(error));
