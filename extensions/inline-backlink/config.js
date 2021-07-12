import { PluginKey } from 'prosemirror-state';

export const extensionName = 'inline-backlink';
export const backLinkNodeName = 'wikiLink';
export const paletteMark = extensionName + '-paletteMark';
export const palettePluginKey = new PluginKey('inlineBacklinkPlatteKey');
export const newNoteLocation = 'CURRENT_DIR'; // or  WORKSPACE_ROOT
