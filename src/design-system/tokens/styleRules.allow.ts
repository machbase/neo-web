// The colours styleRules.test.ts lets stand, each with the reason. An entry covers the lines of a file
// it matches (all of them without `match`); keep it to colours a theme must not move. A line it covers
// may also keep its own dark value after a token (it is not written as the token's definition). An entry that no
// longer matches anything fails the test, so the list shrinks as the code does.

export interface StyleRuleException {
    /** The source file, as a path under src/. */
    file: RegExp;
    /** The lines it covers; every line of the file when left out. */
    match?: RegExp;
    why: string;
}

export const STYLE_RULE_EXCEPTIONS: readonly StyleRuleException[] = [
    // content: colours that are the content's own, not the screen's
    { file: /^assets\/md\//, why: "markdown rendering: GitHub's light and dark stylesheets, syntax colours included" },
    { file: /Camera\/Event\/EventSyncChart\.tsx/, match: /^(?!.*style=\{\{)/, why: 'an ECharts option: chart options are left as written (tokens/README); its React text is held to the rules' },
    { file: /(panels\/video\/VideoPanel\.tsx|Camera\/Event\/EventDetailModal\.tsx)/, match: /248, 113, 113/, why: "a missing video segment's mark (data)" },
    { file: /createPanel\/option\/YAxisOptions\.tsx/, match: /#FF0000/, why: 'the default colour of a new threshold line (data the user edits)' },
    { file: /tql\/ShowVisualization\.tsx/, match: /#000000/, why: "a chart title's own colour (data)" },
    { file: /monaco\/MonacoEditor\.tsx/, match: /editor\.lineHighlightBorder/, why: "the current line's box: both sides of the mix fall back to the dark screen's line, so with no theme the mix is that line" },
    { file: /design-system\/theme\/appChartTheme\.ts/, match: /APP_CHART_LINE =/, why: "a chart's grid and axis lines: both sides of the mix fall back to the dark screen's line, so with no theme the mix is that line" },
    { file: /Camera\/eventsModal\.module\.scss/, match: /#2e7d32|#e65100|#6a1b9a|#283593/, why: "an event chip's colour tells event kinds apart (data colours)" },
    { file: /newBoard\/ShellCards\.tsx/, why: "a terminal's look in a shell card (a terminal's own colours)" },
    { file: /newBoard\/BoardPreview\.tsx/, match: /fill="#|stroke="#/, why: "the Create new cards' pictures of what a file becomes: chart series and SQL keyword colours, drawn blurred behind the card" },
    { file: /newBoard\/widgets\/WeatherWidget\.tsx/, match: /#f5c142|#4d95f2/, why: "the weather glyphs' own colours: the sun's rays and lightning yellow, rain blue" },
    { file: /newBoard\/layout\/WidgetPanel\.tsx/, match: /#4d95f2/, why: "the examples widget's play glyph (its own blue, as on the examples cards)" },
    { file: /panels\/video\/VideoPanel\.scss/, match: /color-black/, why: 'behind a video picture is black' },
    { file: /Camera\/CameraLivePreview\.tsx/, match: /color-black|rgba\(0, 0, 0, 0\.7\)/, why: 'behind and over a video picture: black, and a caption on it' },
    { file: /dashboard\/ShareModal\.scss/, match: /white|color-black|#25d366/, why: "a social network's brand button" },

    // light modes the old code still carries next to its dark rules
    { file: /dashboard\/panels\/PanelHeader\.scss/, match: /black|rgb\(58, 58, 58\)/, why: 'a dashboard panel set to the white chart theme (.panel-theme-white)' },
    { file: /modal\/Modal\.scss/, match: /black|color-white|rgba\(38, 40, 49/, why: "the old modal's light mode (.modal-theme-white): dark lines on white" },
    { file: /assets\/scss\/variables\.scss/, match: /^\$l-/, why: "the old light palette ($l-*): a light mode's own values next to the dark ones" },
    { file: /(UrlDownloadModal|DBMountModal|FolderModal)\.scss/, match: /rgba\(38, 40, 49, 0\.5\)|#262831|color-white/, why: "the old dialogs' light mode (their -dark rules paint over it)" },
    { file: /tql\/Table\.scss/, match: /white/, why: "the TQL table's light mode" },
    { file: /^view\/Home\//, match: /color-white/, why: "the old Home view's light page" },

    { file: /shell\/(appTerminalTheme\.ts|Shell\.scss)/, match: /#000\b|#000000|#add6ff/, why: "a terminal's own black and its selection (the xterm palette), whatever the page around it" },

    { file: /panels\/chart\/LineChart\.tsx/, match: /ChartThemeTextColor/, why: "a dashboard panel's TQL output follows the panel's chart theme with no theme set (a white chart theme: dark text)" },

    // states drawn on purpose another way
    { file: /dataViewer\/DataViewerPage\.scss/, match: /--color-surface-hover-(block|light)\)/, why: 'a picked row in a checklist: the checkbox says it, the row only tints (a selection would stripe the list)' },
    { file: /side\/AppStore\/PkgPillBar\.scss/, match: /--neo-active-bg/, why: "the pill of the page that is open: where you are (active), not an item picked in a list (the side panel's selected)" },
    { file: /side\/AppStore\/item\.scss/, match: /background: t\.\$side-hover-bg;/, why: "the App Store's selected card: its accent bar says it, the card only takes the panel's hover wash (a selection is the accent's own hue and hid the bar)" },
    { file: /ExplorerSearchFilter\.scss/, match: /search-match-bg-onsel/, why: 'a search match highlighted over a selected row' },
    { file: /newBoard\/legacy\/index\.tsx/, match: /hover-bg, rgba\(200, 200, 200/, why: 'a drop target while a file is dragged over it: a hover' },
    { file: /design-system\/tokens\/_mixins\.scss/, match: /selected-bg;|radial-gradient/, why: "a state mixin (active-state, drag-handle states): the state is in the caller's selector" },
    { file: /newBoard\/index\.scss/, match: /text-on-accent, #1e1e1e/, why: "dark ink on the yellow match badge: text-on-accent is the primary and delete fills' text" },
    { file: /LegacyBrowserNotice/, match: /text-on-accent/, why: "dark ink on the amber notice (text-on-accent is the primary and delete fills' text), and its focus ring takes that ink" },

    // not part of the product
    { file: /rpcProbe\/RpcProbe\.tsx/, why: "a developer page, drawn in GitHub's dark colours on purpose" },
];
