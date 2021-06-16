import { BangleIOContext } from 'bangle-io-context/index';
import { frontMatterMarkdownItPlugin } from '@bangle.dev/markdown-front-matter';
import editorCore from 'editor-core/index';
import inlineCommandPalette from 'inline-command-palette/index';
import inlineBacklinkPalette from 'inline-backlink/index';
import collapsibleHeading from 'collapsible-heading/index';
import imageExtension from 'image-extension/index';
import inlineEmoji from 'inline-emoji/index';
import collabExtension from 'collab-extension/index';
import editorScrollExtension from 'editor-scroll-extension';
import corePalette from 'core-palettes';
import coreActions from 'core-actions';

// TODO move this async, i think a promise should be fine.
export const bangleIOContext = new BangleIOContext({
  coreRawSpecs: [],
  getCorePlugins: () => [],
  extensions: [
    inlineEmoji,
    editorCore,
    collabExtension,
    inlineCommandPalette,
    inlineBacklinkPalette,
    collapsibleHeading,
    imageExtension,
    editorScrollExtension,
    coreActions,
    // NOTE: keep the core palette last
    // as it has note palette in it
    corePalette,
  ],
  markdownItPlugins: [frontMatterMarkdownItPlugin],
});
