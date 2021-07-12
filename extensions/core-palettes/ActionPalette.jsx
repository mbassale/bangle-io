import React, {
  useContext,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';

import { UniversalPalette, TerminalIcon } from 'ui-components';
import { extensionName } from './config';
import { useActionContext } from 'action-context';
import { useRecencyWatcher } from './hooks';
import { useExtensionRegistryContext } from 'extension-registry';

const identifierPrefix = '>';
export const actionPalette = {
  type: extensionName + '/action',
  icon: <TerminalIcon />,
  identifierPrefix,
  placeholder: 'Actions',
  parseRawQuery: (rawQuery) => {
    if (identifierPrefix && rawQuery.startsWith(identifierPrefix)) {
      return rawQuery.slice(1);
    }
    return null;
  },
  ReactComponent: React.forwardRef(ActionPaletteUIComponent),
};

const storageKey = 'ActionPaletteUIComponent/1';

function ActionPaletteUIComponent(
  { query, onSelect, getActivePaletteItem },
  ref,
) {
  const extensionRegistry = useExtensionRegistryContext();
  const { dispatchAction } = useActionContext();
  const { injectRecency, updateRecency } = useRecencyWatcher(storageKey);

  const items = useMemo(() => {
    let actions = injectRecency(
      extensionRegistry
        .getRegisteredActions()
        .filter((obj) => !obj.hidden)
        .map((actionDefinition) => {
          return {
            uid: actionDefinition.name,
            title: actionDefinition.title,
            data: actionDefinition,
          };
        })
        .filter((obj) => strMatch(obj.title, query)),
    );

    return actions.slice(0, 50);
  }, [extensionRegistry, injectRecency, query]);

  const onExecuteItem = useCallback(
    (getUid, sourceInfo) => {
      const uid = getUid(items);
      const item = items.find((item) => item.uid === uid);
      if (item) {
        dispatchAction({ name: item.data.name });
        updateRecency(uid);
      }
    },
    [dispatchAction, updateRecency, items],
  );

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
          <kbd className="font-normal">Enter</kbd> Select a Palette
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
