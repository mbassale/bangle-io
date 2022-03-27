import {
  blockquote,
  bold,
  bulletList,
  code,
  codeBlock,
  hardBreak,
  heading,
  history,
  horizontalRule,
  italic,
  link,
  listItem,
  orderedList,
  paragraph,
  strike,
  underline,
} from '@bangle.dev/base-components';
import {
  EditorView,
  keymap,
  NodeSelection,
  Plugin,
  PluginKey,
} from '@bangle.dev/pm';
import { floatingMenu } from '@bangle.dev/react-menu';
import { tablePlugins } from '@bangle.dev/table';
import { timestamp } from '@bangle.dev/timestamp';
import { trailingNode } from '@bangle.dev/trailing-node';

import { intersectionObserverPluginKey } from '@bangle.io/constants';
import { intersectionObserverPlugin } from '@bangle.io/pm-plugins';

import { activeNode } from './active-node';
import { collabPlugin } from './collab-plugin';
import { pluginsFactory } from './collapsible-heading-deco';
import { editingAllowedPlugin } from './editing-allowed';
import { watchEditorFocus } from './watch-editor-focus';

export const menuKey = new PluginKey('menuKey');

const getScrollContainer = (view: EditorView) => {
  return view.dom.parentElement!;
};

const { queryIsSelectionAroundLink, queryIsLinkActive } = link;

export const getPlugins = () => {
  return [
    typeof window !== 'undefined' &&
      intersectionObserverPlugin({
        pluginKey: intersectionObserverPluginKey,
        intersectionObserverOpts: {
          root: window.document.body,
          rootMargin: '0px',
          threshold: 0,
        },
      }),

    floatingMenu.plugins({
      key: menuKey,
      tooltipRenderOpts: {
        getScrollContainer,
      },
      calculateType: (state, prevType) => {
        if (state.selection instanceof NodeSelection) {
          return null;
        }
        if (queryIsSelectionAroundLink()(state) || queryIsLinkActive()(state)) {
          return 'linkSubMenu';
        }
        if (state.selection.empty) {
          return null;
        }

        return 'defaultMenu';
      },
    }),
    blockquote.plugins(),
    bold.plugins(),
    bulletList.plugins(),
    code.plugins(),
    codeBlock.plugins(),
    collabPlugin,
    hardBreak.plugins(),
    heading.plugins({
      keybindings: {
        ...heading.defaultKeys,
        toggleCollapse: 'Shift-Meta-1',
        toH4: undefined,
        toH5: undefined,
        toH6: undefined,
      },
    }),
    history.plugins(),
    horizontalRule.plugins(),
    italic.plugins(),
    link.plugins(),
    listItem.plugins(),
    orderedList.plugins(),
    paragraph.plugins(),
    strike.plugins(),
    tablePlugins(),
    timestamp.plugins(),
    trailingNode.plugins(),
    underline.plugins(),
    new Plugin({
      props: {
        // This is needed by jumping to a heading to atleast show up
        // in the middle of screen.
        // TODO the /4 value makes it a bit weird when moving a node up
        // or down.
        scrollMargin: Math.floor(window.innerHeight / 4),
      },
    }),
    pluginsFactory(),
    activeNode(),
    editingAllowedPlugin,
    watchEditorFocus,
    blockKeyPresses(),
  ];
};

/**
 * Prevents tab presses going out of editor
 */
export function blockKeyPresses() {
  return keymap({
    'Tab': (state) => {
      return true;
    },
    'Meta-s': (state) => {
      return true;
    },
  });
}