import { ApplicationRef, Provider, Type } from '@angular/core';
import { BootstrapContext, bootstrapApplication, provideClientHydration } from '@angular/platform-browser';
import { renderApplication } from '@angular/platform-server';
import { provideServerRendering } from '@angular/ssr';

/**
 * Renders `component` to an HTML string the way the real Node SSR server would, using
 * `@angular/platform-server` directly instead of overriding `PLATFORM_ID` on a `TestBed`
 * component: that override only fools `isPlatformBrowser()` checks, it does not reproduce the
 * actual server render path (no `renderApplication`, no real SSR-only providers).
 *
 * `component`'s selector must match the `<app-root>` placeholder below, since `bootstrapApplication`
 * needs a real element in the given document to attach to.
 */
export function ssr(component: Type<unknown>, providers: Provider[] = []): Promise<string> {
  return renderApplication(
    (context: BootstrapContext) =>
      bootstrapApplication(
        component,
        { providers: [provideServerRendering(), provideClientHydration(), ...providers] },
        context,
      ),
    { document: '<html><head></head><body><app-root></app-root></body></html>' },
  );
}

/**
 * Drops the server-rendered `<body>` contents from `html` into the real document, then
 * hydrates `component` against them, the way the browser does after loading an SSR page.
 *
 * `component` must be a *different class* than the one given to `ssr()`, even with an identical
 * template: Angular caches a component's compiled `TView` on its definition the first time it is
 * used, and reusing the same class for both the server render and the hydration within one
 * process (both happen in this same test here, unlike in production) would hydrate against that
 * stale cached data.
 *
 * Returns any `console.error` messages logged while hydrating, so a test can assert that
 * hydration did not silently fall back to a full client re-render because of a mismatch.
 */
export async function hydrate(
  component: Type<unknown>,
  html: string,
  providers: Provider[] = [],
): Promise<{ appRef: ApplicationRef; consoleErrors: string[] }> {
  const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
  document.body.innerHTML = bodyMatch ? bodyMatch[1] : html;

  const consoleErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(' '));
    originalConsoleError(...args);
  };

  let appRef: ApplicationRef;
  try {
    appRef = await bootstrapApplication(component, {
      providers: [provideClientHydration(), ...providers],
    });
    await appRef.whenStable();
  } finally {
    console.error = originalConsoleError;
  }

  return { appRef, consoleErrors };
}
