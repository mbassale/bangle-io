import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
} from '@bangle.io/baby-fs';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import {
  goToLocation,
  historyUpdateOpenedWsPaths,
} from '@bangle.io/page-context';
import { sleep } from '@bangle.io/utils';
import {
  FileOps,
  HELP_FS_WORKSPACE_NAME,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '@bangle.io/workspaces';
import {
  OpenedWsPaths,
  wsNameToPathname,
  wsPathToPathname,
} from '@bangle.io/ws-path';

import {
  checkFileExists,
  createNote,
  deleteNote,
  getFileOps,
  getNote,
  isCurrentWsName,
  pushWsPath,
  refreshWsPaths,
  renameNote,
  updateLocation,
  updateOpenedWsPaths,
} from '../operations';
import {
  createState,
  createStateWithWsName,
  createStore,
  getActionNamesDispatched,
  noSideEffectsStore,
} from './test-utils';

jest.mock('@bangle.io/workspaces', () => {
  const rest = jest.requireActual('@bangle.io/workspaces');
  return {
    ...rest,
    FileOps: {
      renameFile: jest.fn(),
      deleteFile: jest.fn(),
      getDoc: jest.fn(),
      saveDoc: jest.fn(),
      listAllFiles: jest.fn(),
      checkFileExists: jest.fn(),
    },
  };
});

jest.mock('@bangle.io/page-context', () => {
  const ops = jest.requireActual('@bangle.io/page-context');
  return {
    ...ops,
    historyUpdateOpenedWsPaths: jest.fn(),
    goToLocation: jest.fn(),
  };
});

let listAllFilesMock = FileOps.listAllFiles as jest.MockedFunction<
  typeof FileOps.listAllFiles
>;
let renameFileMock = FileOps.renameFile as jest.MockedFunction<
  typeof FileOps.renameFile
>;
let checkFileExistsMock = FileOps.checkFileExists as jest.MockedFunction<
  typeof FileOps.checkFileExists
>;
let saveDocMock = FileOps.saveDoc as jest.MockedFunction<
  typeof FileOps.saveDoc
>;
let deleteFileMock = FileOps.deleteFile as jest.MockedFunction<
  typeof FileOps.deleteFile
>;
let historyUpdateOpenedWsPathsMock =
  historyUpdateOpenedWsPaths as jest.MockedFunction<
    typeof historyUpdateOpenedWsPaths
  >;
let goToLocationMock = goToLocation as jest.MockedFunction<typeof goToLocation>;

beforeEach(() => {
  listAllFilesMock.mockResolvedValue([]);
  renameFileMock.mockResolvedValue(undefined);
  checkFileExistsMock.mockResolvedValue(false);
  saveDocMock.mockResolvedValue(undefined);
  deleteFileMock.mockResolvedValue(undefined);
  historyUpdateOpenedWsPathsMock.mockImplementation(() => () => {});
  goToLocationMock.mockImplementation(() => () => {});
});

test('updateLocation', () => {
  let state = createState();

  const dispatch = jest.fn();

  updateLocation({ search: 'test-search', pathname: 'test-pathname' })(
    state,
    dispatch,
  );

  expect(dispatch).toBeCalledTimes(1);
});

test('isCurrentWsName', () => {
  let state = createStateWithWsName('my-workspace');

  expect(isCurrentWsName('my-workspace')(state)).toBe(true);
  expect(isCurrentWsName('not')(state)).toBe(false);
});

describe('refreshWsPaths', () => {
  test('refreshWsPaths 1', async () => {
    listAllFilesMock.mockImplementation(async () => {
      return ['my-ws:one.md'];
    });
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsNameToPathname('my-ws'),
    });

    refreshWsPaths()(store.state, store.dispatch);

    expect(listAllFilesMock).toBeCalledTimes(1);
    expect(listAllFilesMock).toBeCalledWith('my-ws');

    await sleep(5);

    expect(dispatchSpy).toBeCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({
      id: expect.any(String),
      name: 'action::workspace-context:update-ws-paths',
      value: {
        wsName: 'my-ws',
        wsPaths: ['my-ws:one.md'],
      },
    });
  });

  test('does not dispatch if no workspace', async () => {
    listAllFilesMock.mockImplementation(async () => {
      return ['my-ws:one.md'];
    });

    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: '',
    });

    refreshWsPaths()(store.state, store.dispatch);

    await sleep(5);

    expect(dispatchSpy).toBeCalledTimes(0);
    expect(listAllFilesMock).toBeCalledTimes(0);
  });

  test('handles error', async () => {
    listAllFilesMock.mockRejectedValue(new BaseFileSystemError('test-error'));
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsNameToPathname('my-ws'),
    });

    refreshWsPaths()(store.state, store.dispatch);

    expect(listAllFilesMock).toBeCalledTimes(1);

    await sleep(5);

    expect(dispatchSpy).toBeCalledTimes(1);

    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::workspace-context:update-ws-paths',
      value: {
        wsName: 'my-ws',
        wsPaths: undefined,
      },
    });
  });

  test('handles permission error', async () => {
    listAllFilesMock.mockRejectedValue(
      new BaseFileSystemError('test-error', NATIVE_BROWSER_PERMISSION_ERROR),
    );
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsNameToPathname('my-ws'),
    });

    refreshWsPaths()(store.state, store.dispatch);

    expect(listAllFilesMock).toBeCalledTimes(1);

    await sleep(5);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);

    expect(goToLocationMock).toBeCalledTimes(1);
    expect(goToLocationMock).nthCalledWith(
      1,
      '/ws-auth/my-ws?code=BABY_FS_NATIVE_BROWSER_USER_ABORTED_ERROR',
      {
        replace: true,
      },
    );

    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::workspace-context:update-ws-paths',
      value: {
        wsName: 'my-ws',
        wsPaths: undefined,
      },
    });
  });

  test('handles workspace not found error', async () => {
    listAllFilesMock.mockRejectedValue(
      new WorkspaceError('test-error', WORKSPACE_NOT_FOUND_ERROR),
    );
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsNameToPathname('my-ws'),
    });

    refreshWsPaths()(store.state, store.dispatch);

    expect(listAllFilesMock).toBeCalledTimes(1);

    await sleep(5);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);

    expect(goToLocationMock).toBeCalledTimes(1);
    expect(goToLocationMock).nthCalledWith(1, '/ws-not-found/my-ws', {
      replace: true,
    });

    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::workspace-context:update-ws-paths',
      value: {
        wsName: 'my-ws',
        wsPaths: undefined,
      },
    });
  });
});

test('getFileOps', async () => {
  listAllFilesMock.mockResolvedValue(['my-ws:one.md']);
  let { store } = createStore({
    locationPathname: wsNameToPathname('my-ws'),
  });

  const fileOps = getFileOps()(store.state, store.dispatch);
  expect(await fileOps?.listAllFiles('my-ws')).toMatchInlineSnapshot(`
    Array [
      "my-ws:one.md",
    ]
  `);
});

describe('updateOpenedWsPaths', () => {
  test('no dispatch if wsName is undefined', () => {
    let { store } = noSideEffectsStore({
      locationPathname: '',
    });

    const res = updateOpenedWsPaths((r) => r)(store.state, store.dispatch);

    expect(res).toBe(false);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);
  });

  test('works when provided with openedWsPaths', () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsNameToPathname('my-ws'),
    });

    const res = updateOpenedWsPaths(
      OpenedWsPaths.createFromArray(['my-ws:one.md']),
    )(store.state, store.dispatch);

    expect(res).toBe(true);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual(['my-ws:one.md', null]);

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      { replace: false },
    );
  });

  test('respects replace param', () => {
    let { store } = noSideEffectsStore({
      locationPathname: wsNameToPathname('my-ws'),
    });

    const res = updateOpenedWsPaths(
      OpenedWsPaths.createFromArray(['my-ws:one.md']),
      {
        replaceHistory: true,
      },
    )(store.state, store.dispatch);

    expect(res).toBe(true);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      { replace: true },
    );
  });

  test('works when provided with openedWsPaths as a function', () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:test-note.md'),
    });

    let existingOpenedWsPaths: OpenedWsPaths | undefined;
    const res = updateOpenedWsPaths((r) => {
      existingOpenedWsPaths = r;
      return r.updateByIndex(0, 'my-ws:two.md');
    })(store.state, store.dispatch);

    expect(existingOpenedWsPaths?.toArray()).toEqual([
      'my-ws:test-note.md',
      null,
    ]);

    expect(res).toBe(true);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual(['my-ws:two.md', null]);
    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      { replace: false },
    );
  });

  test('does not attempt to fix existing (in the slice state) broken paths', () => {
    const { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: '/ws/my-ws/test-notemd',
    });
    const res = updateOpenedWsPaths((r) => {
      return r;
    })(store.state, store.dispatch);

    expect(res).toBe(false);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);
  });

  test('handles invalid path in secondary', () => {
    let { store } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:test-note.md'),
    });

    const res = updateOpenedWsPaths((r) => {
      return r.updateByIndex(1, 'my-ws-hello');
    })(store.state, store.dispatch);

    expect(res).toBe(false);

    expect(goToLocationMock).toBeCalledTimes(1);
    expect(goToLocationMock).nthCalledWith(1, `/ws-invalid-path/my-ws`, {
      replace: true,
    });
  });
});

describe('renameNote', () => {
  test('returns false when wsName is not defined', () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: '',
    });

    const res = renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    expect(res).toBe(false);
    expect(dispatchSpy).toBeCalledTimes(0);
  });

  test('works when the file to be renamed is opened', async () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:test-note.md'),
    });

    renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(renameFileMock).toBeCalledTimes(1);
    expect(renameFileMock).nthCalledWith(
      1,
      'my-ws:test-note.md',
      'my-ws:new-test-note.md',
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual(['my-ws:new-test-note.md', null]);

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      { replace: true },
    );
  });

  test('works when the file to be renamed is opened in secondary', async () => {
    const newSearch = new URLSearchParams('');
    newSearch.set('secondary', 'my-ws:test-note.md');

    let { store } = noSideEffectsStore({
      locationPathname: wsNameToPathname('my-ws'),
      locationSearchQuery: newSearch.toString(),
    });

    renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(renameFileMock).toBeCalledTimes(1);
    expect(renameFileMock).nthCalledWith(
      1,
      'my-ws:test-note.md',
      'my-ws:new-test-note.md',
    );

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual([null, 'my-ws:new-test-note.md']);

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      { replace: true },
    );
  });

  test('works when the file to be renamed is not opened', async () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:my-other-file.md'),
    });

    renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(renameFileMock).toBeCalledTimes(1);
    expect(renameFileMock).nthCalledWith(
      1,
      'my-ws:test-note.md',
      'my-ws:new-test-note.md',
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);
  });

  test('renaming the same file', async () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:test-note.md'),
    });

    renameNote('my-ws:test-note.md', 'my-ws:test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(renameFileMock).toBeCalledTimes(1);
    expect(renameFileMock).nthCalledWith(
      1,
      'my-ws:test-note.md',
      'my-ws:test-note.md',
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);
  });

  test('renaming  when primary and secondary are same', async () => {
    const newSearch = new URLSearchParams('');
    newSearch.set('secondary', 'my-ws:test-note.md');

    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:test-note.md'),
      locationSearchQuery: newSearch,
    });

    renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(renameFileMock).toBeCalledTimes(1);
    expect(renameFileMock).nthCalledWith(
      1,
      'my-ws:test-note.md',
      'my-ws:new-test-note.md',
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual(['my-ws:new-test-note.md', 'my-ws:new-test-note.md']);
    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      { replace: true },
    );
  });

  test('throws error when renaming a help doc', () => {
    let { store } = noSideEffectsStore({
      locationPathname: wsNameToPathname(HELP_FS_WORKSPACE_NAME),
    });

    expect(() =>
      renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
        store.state,
        store.dispatch,
        store,
      ),
    ).toThrowErrorMatchingInlineSnapshot(`"Cannot rename a help document"`);

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);
  });
});

describe('getNote', () => {
  test('works', async () => {
    const result = {};
    (FileOps.getDoc as any).mockResolvedValue(result);
    const extensionRegistry: ExtensionRegistry = {} as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsNameToPathname('my-ws'),
    });

    expect(
      await getNote(extensionRegistry, wsPath)(store.state, store.dispatch),
    ).toBe(result);

    expect(FileOps.getDoc).toBeCalledTimes(1);
    expect(dispatchSpy).toBeCalledTimes(0);
  });

  test('does not return result when no wsName', async () => {
    const result = {};
    (FileOps.getDoc as any).mockResolvedValue(result);
    const extensionRegistry: ExtensionRegistry = {} as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: '',
    });

    expect(
      await getNote(extensionRegistry, wsPath)(store.state, store.dispatch),
    ).toBe(undefined);
    expect(FileOps.getDoc).toBeCalledTimes(0);
    expect(dispatchSpy).toBeCalledTimes(0);
  });
});

describe('createNote', () => {
  test('works when file does not exist', async () => {
    checkFileExistsMock.mockResolvedValue(false);
    const extensionRegistry: ExtensionRegistry = {
      specRegistry: {},
    } as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    const doc: any = {};

    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:test-note.md'),
    });

    createNote(extensionRegistry, wsPath, { doc })(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);
    expect(checkFileExistsMock).toBeCalledTimes(1);
    expect(checkFileExistsMock).nthCalledWith(1, wsPath);

    expect(saveDocMock).toBeCalledTimes(1);
    expect(saveDocMock).nthCalledWith(
      1,
      wsPath,
      doc,
      extensionRegistry.specRegistry,
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
  });

  test('works when file exists', async () => {
    checkFileExistsMock.mockResolvedValue(true);
    const extensionRegistry: ExtensionRegistry = {
      specRegistry: {},
    } as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    const doc: any = {};

    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:test-note.md'),
    });

    createNote(extensionRegistry, wsPath, { doc })(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);
    expect(checkFileExistsMock).toBeCalledTimes(1);
    expect(checkFileExistsMock).nthCalledWith(1, wsPath);

    expect(saveDocMock).toBeCalledTimes(0);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
  });

  test('does not create when no workspace', async () => {
    checkFileExistsMock.mockResolvedValue(false);
    const extensionRegistry: ExtensionRegistry = {
      specRegistry: {},
    } as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    const doc: any = {};

    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: '',
    });

    createNote(extensionRegistry, wsPath, { doc, open: false })(
      store.state,
      store.dispatch,
      store,
    );
    await sleep(0);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);
  });

  test('when open is false', async () => {
    checkFileExistsMock.mockResolvedValue(false);
    const extensionRegistry: ExtensionRegistry = {
      specRegistry: {},
    } as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    const doc: any = {};

    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:test-note.md'),
    });

    createNote(extensionRegistry, wsPath, { doc, open: false })(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);
    expect(checkFileExistsMock).toBeCalledTimes(1);
    expect(checkFileExistsMock).nthCalledWith(1, wsPath);

    expect(saveDocMock).toBeCalledTimes(1);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
  });
});

describe('deleteNote', () => {
  test('deletes when the file is opened', async () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:test-note.md'),
    });

    deleteNote('my-ws:test-note.md')(store.state, store.dispatch, store);

    await sleep(0);
    expect(deleteFileMock).toBeCalledTimes(1);
    expect(deleteFileMock).nthCalledWith(1, 'my-ws:test-note.md');

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual([null, null]);

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      { replace: true },
    );

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
  });

  test('deletes when the file is not opened', async () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:some-other-test-note.md'),
    });

    deleteNote('my-ws:test-note.md')(store.state, store.dispatch, store);

    await sleep(0);
    expect(deleteFileMock).toBeCalledTimes(1);
    expect(deleteFileMock).nthCalledWith(1, 'my-ws:test-note.md');

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
  });

  test('deletes multiple files', async () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:some-other-test-note.md'),
    });

    deleteNote(['my-ws:test-note1.md', 'my-ws:test-note2.md'])(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(deleteFileMock).toBeCalledTimes(2);
    expect(deleteFileMock).nthCalledWith(1, 'my-ws:test-note1.md');
    expect(deleteFileMock).nthCalledWith(2, 'my-ws:test-note2.md');

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
  });
});

describe('pushWsPath', () => {
  let originalOpen = window.open;
  beforeEach(() => {
    window.open = jest.fn();
  });
  afterEach(() => {
    window.open = originalOpen;
  });

  test('works with new tab', () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:some-other-test-note.md'),
    });
    pushWsPath('my-ws:test-note.md', true)(store.state, store.dispatch);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);

    expect(window.open).toBeCalledTimes(1);
    expect(window.open).nthCalledWith(1, '/ws/my-ws/test-note.md');
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);
  });

  test('works when tab is false', () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      locationPathname: wsPathToPathname('my-ws:some-other-test-note.md'),
    });
    pushWsPath('my-ws:test-note.md')(store.state, store.dispatch);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual(['my-ws:test-note.md', null]);

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      { replace: false },
    );

    expect(window.open).toBeCalledTimes(0);
  });
});

describe('checkFileExists', () => {
  test('works', async () => {
    checkFileExistsMock.mockResolvedValue(true);
    let { store, dispatchSpy } = noSideEffectsStore({});

    const result = await checkFileExists('my-ws:test-note.md')(
      store.state,
      store.dispatch,
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);

    expect(result).toBe(true);
  });

  test('false when file does not exists', async () => {
    checkFileExistsMock.mockResolvedValue(false);
    let { store, dispatchSpy } = noSideEffectsStore({});
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);

    const result = await checkFileExists('my-ws:test-note.md')(
      store.state,
      store.dispatch,
    );

    expect(checkFileExistsMock).toBeCalledTimes(1);
    expect(checkFileExistsMock).nthCalledWith(1, 'my-ws:test-note.md');
    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);

    expect(result).toBe(false);
  });
});