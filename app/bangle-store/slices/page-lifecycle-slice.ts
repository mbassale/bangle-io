/// <reference path="../missing-types.d.ts" />

import lifecycle from 'page-lifecycle';

import { Slice, SliceKey } from '@bangle.io/create-store';
import type { PageLifeCycleState } from '@bangle.io/slice-page';
import { pageSliceKey, setPageLifeCycleState } from '@bangle.io/slice-page';
import { assertNonWorkerGlobalScope } from '@bangle.io/utils';

const pendingSymbol = Symbol('pending');

assertNonWorkerGlobalScope();

type PageLifeCycleEvent = {
  newState: PageLifeCycleState;
  oldState: PageLifeCycleState;
};

const key = new SliceKey('pageLifeCycleSlice');

export function pageLifeCycleSlice() {
  return new Slice({
    key: key,
    sideEffect: [
      key.effect(function watchPageLifeCycleEffect() {
        return {
          deferredOnce(store, abortSignal) {
            const handler = (event: PageLifeCycleEvent) => {
              setPageLifeCycleState(event.newState, event.oldState)(
                store.state,
                store.dispatch,
              );
            };

            lifecycle.addEventListener('statechange', handler);

            handler({ newState: lifecycle.state, oldState: undefined });
            abortSignal.addEventListener(
              'abort',
              () => {
                lifecycle.removeEventListener('statechange', handler);
              },
              { once: true },
            );
          },
        };
      }),

      key.reactor(
        {
          blockReload: pageSliceKey.select('blockReload'),
        },
        (_, __, { blockReload }) => {
          if (blockReload) {
            lifecycle.addUnsavedChanges(pendingSymbol);
          } else {
            lifecycle.removeUnsavedChanges(pendingSymbol);
          }
        },
      ),
    ],
  });
}
