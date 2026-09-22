import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { categories } from 'ngx-emoji-mart-next/ngx-emoji';

import { PickerModule } from './picker.module';
import { frame, timeout } from './testing-utils';

/**
 * The category data is shared by all pickers and by all tests of this file. Each test must leave
 * it as it was, so the tests in this file do not depend on their order.
 */
describe('PickerComponent category data', () => {
  function createPicker(template: string, props: Record<string, unknown> = {}) {
    @Component({ template, imports: [PickerModule] })
    class HostComponent {}

    const fixture = TestBed.createComponent(HostComponent);
    Object.assign(fixture.componentInstance, props);
    fixture.detectChanges();
    return fixture;
  }

  async function settle(fixture: ComponentFixture<unknown>) {
    // The picker draws the remaining categories in a `setTimeout` and measures them in an
    // animation frame.
    await timeout();
    await frame();
    fixture.detectChanges();
  }

  const snapshot = () =>
    categories.map(category => ({
      id: category.id,
      length: category.emojis?.length,
      first: category.first,
    }));
  const people = (fixture: ComponentFixture<unknown>) => {
    const label = fixture.nativeElement.querySelector(
      '.emoji-mart-category-label[data-name="Smileys & People"]',
    ) as HTMLElement;
    return label.parentElement!.querySelectorAll('.emoji-mart-emoji').length;
  };

  it('should not change the category data that every picker shares', async () => {
    const before = snapshot();
    const fixture = createPicker('<emoji-mart></emoji-mart>');

    // The picker first draws only a part of the last category that it draws.
    expect(snapshot()).toEqual(before);

    await settle(fixture);

    expect(snapshot()).toEqual(before);
  });

  it('should draw all emojis when several pickers are created at once', async () => {
    const before = snapshot();
    const first = createPicker('<emoji-mart></emoji-mart>');
    const second = createPicker('<emoji-mart></emoji-mart>');
    await settle(first);
    await settle(second);

    expect(snapshot()).toEqual(before);
    expect(people(second)).toBe(people(first));
    expect(people(first)).toBeGreaterThan(60);
  });

  it('should not change the `categories` that it gets', async () => {
    const mine: unknown[] = [];
    const fixture = createPicker('<emoji-mart [categories]="mine"></emoji-mart>', { mine });
    await settle(fixture);

    expect(mine).toEqual([]);
  });
});
