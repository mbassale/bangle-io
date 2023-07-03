/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { LandingPage } from '../pages/LandingPage';

let originalConsoleError = console.error;

beforeEach(() => {
  console.error = originalConsoleError;
});

test('show landing page', () => {
  // silencing the error from polluting the logging
  console.error = jest.fn();
  let result = render(
    <div>
      <LandingPage />
    </div>,
  );
  const newWorkspaceButton = screen.getByTestId('new-workspace-button');
  const workspaceList = screen.getByTestId('workspace-list');
  expect(result.container.innerHTML).toContain('Welcome to Bangle.io');
  expect(newWorkspaceButton).toBeTruthy();
  expect(workspaceList).toBeTruthy();
  const isButtonAfterList =
    workspaceList.compareDocumentPosition(newWorkspaceButton) ==
    Node.DOCUMENT_POSITION_FOLLOWING;
  expect(isButtonAfterList).toBeTruthy();
});
