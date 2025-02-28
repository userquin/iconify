// Customisations
export { compare as compareCustomisations } from './customisations/compare';
export {
	defaults as defaultCustomisations,
	mergeCustomisations,
} from './customisations/index';

// Customisations: converting attributes in components
export { toBoolean } from './customisations/bool';
export {
	flipFromString,
	alignmentFromString,
} from './customisations/shorthand';
export { rotateFromString } from './customisations/rotate';

// Icon names
export { stringToIcon, validateIcon as validateIconName } from './icon/name';
export { matchName as matchIconName } from './icon/index';

// Icon data
export { mergeIconData } from './icon/merge';
export {
	iconDefaults as defaultIconData,
	fullIcon as fullIconData,
} from './icon/index';

// Icon set functions
export { parseIconSet, isVariation } from './icon-set/parse';
export { validateIconSet } from './icon-set/validate';
export { expandIconSet } from './icon-set/expand';
export { minifyIconSet } from './icon-set/minify';
export { getIcons } from './icon-set/get-icons';
export { getIconData } from './icon-set/get-icon';

// Icon set: convert information
export { convertIconSetInfo } from './icon-set/convert-info';

// Build SVG
export { iconToSVG } from './svg/build';
export { replaceIDs } from './svg/id';
export { calculateSize } from './svg/size';

// Colors
export { colorKeywords } from './colors/keywords';
export { stringToColor, compareColors, colorToString } from './colors/index';
