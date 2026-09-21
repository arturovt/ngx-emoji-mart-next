import { provideZonelessChangeDetection } from '@angular/core';

// The tests run without `zone.js`.
export default [provideZonelessChangeDetection()];
