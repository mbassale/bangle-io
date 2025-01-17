import type { Story } from '@storybook/react';
import React from 'react';

import { SEVERITY } from '@bangle.io/constants';
import { showNotification } from '@bangle.io/slice-notification';
import { StorybookStore } from '@bangle.io/test-utils';
import { Button } from '@bangle.io/ui-components';

import { NotificationArea } from './NotificationArea';

export default {
  title: 'app-entry/NotificationArea',
  component: NotificationArea,
  argTypes: {},
};

export const Main: Story = (args) => {
  return (
    <div style={{ width: 400 }}>
      <StorybookStore
        onMount={(store) => {
          showNotification({
            severity: SEVERITY.WARNING,
            title: 'Test notification',
            content: 'This is the first',
            uid: 'test-uid-warning',
            createdAt: 1,
          })(store.state, store.dispatch);
          showNotification({
            severity: SEVERITY.SUCCESS,
            title: 'Test notification',
            content: 'This is the second',
            uid: 'test-uid-success',
            createdAt: 1,
          })(store.state, store.dispatch);

          showNotification({
            severity: SEVERITY.INFO,
            title: 'Test notification',
            content: 'This is the third',
            uid: 'test-uid-info',
            createdAt: 1,
          })(store.state, store.dispatch);

          showNotification({
            severity: SEVERITY.ERROR,
            title: 'Test notification',
            content: 'This is the fourd',
            uid: 'test-uid-error',
            createdAt: 1,
          })(store.state, store.dispatch);
        }}
        renderChildren={(store) => (
          <>
            <Button
              text="Show warning"
              className="ml-2"
              onPress={() => {
                showNotification({
                  severity: SEVERITY.WARNING,
                  title: 'Test notification',
                  content: 'This is a notification',
                  uid: 'test-uid' + Date.now(),
                  createdAt: Date.now(),
                })(store.state, store.dispatch);
              }}
            />
            <Button
              text="Show error"
              className="ml-2"
              onPress={() => {
                showNotification({
                  severity: SEVERITY.ERROR,
                  title: 'Test notification',
                  content: 'This is a notification',
                  uid: 'test-uid' + Date.now(),
                  createdAt: Date.now(),
                })(store.state, store.dispatch);
              }}
            />

            <Button
              text="Show success"
              className="ml-2"
              onPress={() => {
                showNotification({
                  severity: SEVERITY.SUCCESS,
                  title: 'Test notification',
                  content: 'This is a notification',
                  uid: 'test-uid' + Date.now(),
                  createdAt: Date.now(),
                })(store.state, store.dispatch);
              }}
            />
            <NotificationArea></NotificationArea>
          </>
        )}
      />
    </div>
  );
};
