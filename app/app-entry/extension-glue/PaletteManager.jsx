import React, {
  useContext,
  useCallback,
  useState,
  useEffect,
  useRef,
} from 'react';
import { useUIManagerContext } from 'ui-context';
import { UniversalPalette } from 'ui-components';
import { useActionContext } from 'action-context';
import { useExtensionRegistryContext } from 'extension-registry';

export function PaletteManager() {
  const {
    paletteMetadata,
    paletteType,
    paletteInitialQuery,
    dispatch,
    widescreen,
  } = useUIManagerContext();
  const inputRef = useRef();
  const [query, updateQuery] = useState(paletteInitialQuery || '');
  const { dispatchAction } = useActionContext();
  const extensionRegistry = useExtensionRegistryContext();

  const dismissPalette = useCallback(
    (focusEditor = true) => {
      updateQuery('');
      dispatch({
        type: 'UI/RESET_PALETTE',
      });
      if (focusEditor) {
        dispatchAction({ name: '@action/editor-core/focus-primary-editor' });
      }
    },
    [dispatch, dispatchAction],
  );

  const paletteRef = useRef();

  const onExecuteItem = useCallback(
    (...args) => {
      dismissPalette();
      paletteRef.current?.onExecuteItem(...args);
    },
    [dismissPalette],
  );

  const updatePalette = useCallback(
    (type, initialQuery = '', metadata = {}) => {
      dispatch({
        type: 'UI/UPDATE_PALETTE',
        value: { type, initialQuery, metadata },
      });
      if (type) {
        document.querySelector('.universal-palette-container input')?.focus();
      }
    },
    [dispatch],
  );

  const { inputProps, updateCounter, resetCounter, counter, onSelect } =
    UniversalPalette.usePaletteDriver(dismissPalette, onExecuteItem);

  useEffect(() => {
    resetCounter();
  }, [query, resetCounter]);

  // reset query if palette type changes
  useEffect(() => {
    updateQuery(paletteInitialQuery || '');
    resetCounter();
  }, [resetCounter, paletteType, paletteInitialQuery]);

  // deriving the final input value helps us avoid keeping two states (paletteType, rawQuery) in sync.
  // with this there is always a a single state paletteType + query , where raw query is derived from it.
  // Note: that we are passing this callback to the children and they are free to override it.
  const updateRawInputValue = useCallback(
    (rawQuery) => {
      const match = extensionRegistry.paletteParseRawQuery(rawQuery);

      resetCounter();
      if (!match) {
        dismissPalette();
        return;
      }

      const query = match.parseRawQuery(rawQuery);
      // if some other palette parses this query, switch to it
      if (match.type !== paletteType) {
        updatePalette(match.type, query);
      } else {
        updateQuery(query);
      }
    },
    [
      resetCounter,
      dismissPalette,
      extensionRegistry,
      paletteType,
      updatePalette,
      updateQuery,
    ],
  );

  const Palette = extensionRegistry.getPalette(paletteType);

  const getActivePaletteItem = useCallback(
    (items) => {
      return items[UniversalPalette.getActiveIndex(counter, items.length)];
    },
    [counter],
  );

  if (!Palette) {
    return null;
  }

  return (
    <UniversalPalette.PaletteContainer
      widescreen={widescreen}
      onClickOutside={dismissPalette}
      onClickInside={() => {
        document.querySelector('.universal-palette-container input')?.focus();
      }}
    >
      <UniversalPalette.PaletteInput
        leftNode={Palette.icon}
        placeholder={Palette.placeholder}
        inputValue={Palette.identifierPrefix + query}
        onInputValueChange={updateRawInputValue}
        ref={inputRef}
        {...inputProps}
      />
      <Palette.ReactComponent
        ref={paletteRef}
        query={query}
        paletteType={paletteType}
        paletteMetadata={paletteMetadata}
        updatePalette={updatePalette}
        dismissPalette={dismissPalette}
        onSelect={onSelect}
        counter={counter}
        getActivePaletteItem={getActivePaletteItem}
        updateCounter={updateCounter}
      />
    </UniversalPalette.PaletteContainer>
  );
}
