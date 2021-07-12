import React, {
  useEffect,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import { removeMdExtension } from 'utils';
import { resolvePath } from 'ws-path';

import {
  UniversalPalette,
  ButtonIcon,
  FileDocumentIcon,
  SecondaryEditorIcon,
} from 'ui-components';
import { useWorkspaceContext } from 'workspace-context';
import { extensionName } from './config';
import { keyDisplayValue } from 'config';
import { useRecencyWatcher } from './hooks';

const emptyArray = [];

export const notesPalette = {
  type: extensionName + '/notes',
  icon: <FileDocumentIcon />,
  identifierPrefix: '',
  placeholder: "Enter a file name or type '?' to see other palettes.",
  // match with any query
  parseRawQuery: (rawQuery) => rawQuery,
  ReactComponent: React.forwardRef(NotesPalette),
};
const storageKey = 'NotesPalette/1';

function NotesPalette(
  { query, dismissPalette, onSelect, getActivePaletteItem },
  ref,
) {
  const {
    pushWsPath,
    primaryWsPath,
    noteWsPaths = emptyArray,
  } = useWorkspaceContext();
  const { injectRecency, updateRecency } = useRecencyWatcher(storageKey);
  const items = useMemo(() => {
    const _items = injectRecency(
      noteWsPaths
        .map((wsPath) => {
          const { fileName, dirPath } = resolvePath(wsPath);
          return {
            uid: wsPath,
            title: removeMdExtension(fileName),
            extraInfo: dirPath,
            data: {
              wsPath,
            },
            rightHoverNode: (
              <ButtonIcon
                hint={`Open in split screen`}
                hintPos="left"
                onClick={async (e) => {
                  e.stopPropagation();
                  pushWsPath(wsPath, false, true);
                  dismissPalette();
                }}
              >
                <SecondaryEditorIcon
                  style={{
                    height: 18,
                    width: 18,
                  }}
                />
              </ButtonIcon>
            ),
          };
        })
        .filter((obj) => strMatch(obj.title, query)),
    );

    return _items.slice(0, 100);
  }, [noteWsPaths, injectRecency, pushWsPath, dismissPalette, query]);

  const onExecuteItem = useCallback(
    (getUid, sourceInfo) => {
      const uid = getUid(items);
      const item = items.find((item) => item.uid === uid);
      if (item) {
        pushWsPath(item.data.wsPath, sourceInfo.metaKey, sourceInfo.shiftKey);
      }
    },
    [pushWsPath, items],
  );

  useEffect(() => {
    // doing it this way, instead of inside `onExecuteItem`
    // so that we can monitor recency more widely, as there
    // are external ways to open a note.
    if (primaryWsPath) {
      updateRecency(primaryWsPath);
    }
  }, [updateRecency, primaryWsPath]);

  // Expose onExecuteItem for the parent to call it
  // If we dont do this clicking or entering will not work
  useImperativeHandle(
    ref,
    () => ({
      onExecuteItem,
    }),
    [onExecuteItem],
  );

  const activeItem = getActivePaletteItem(items);

  return (
    <>
      <UniversalPalette.PaletteItemsContainer>
        {items.map((item) => {
          return (
            <UniversalPalette.PaletteItemUI
              key={item.uid}
              item={item}
              onClick={onSelect}
              isActive={activeItem === item}
            />
          );
        })}
      </UniversalPalette.PaletteItemsContainer>
      <UniversalPalette.PaletteInfo>
        <UniversalPalette.PaletteInfoItem>
          use:
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Open
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">Shift-Enter</kbd> Open in side
        </UniversalPalette.PaletteInfoItem>
        <UniversalPalette.PaletteInfoItem>
          <kbd className="font-normal">{keyDisplayValue('Mod')}-Enter</kbd> Open
          in new tab
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </>
  );
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
