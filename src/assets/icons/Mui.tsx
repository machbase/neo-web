import type { ComponentProps, FunctionComponent, SVGProps } from 'react';
import { ReactComponent as MuiShellSvg } from '@/assets/icons/material/console.svg?react';
import { ReactComponent as MuiSqlSvg } from '@/assets/icons/material/database.svg?react';
import { ReactComponent as MuiDocumentSvg } from '@/assets/icons/material/document.svg?react';
import { ReactComponent as MuiImageSvg } from '@/assets/icons/material/image.svg?react';
import { ReactComponent as MuiJsonSvg } from '@/assets/icons/material/json.svg?react';
import { ReactComponent as MuiMarkdownSvg } from '@/assets/icons/material/markdown.svg?react';
import { ReactComponent as MuiWorksheetSvg } from '@/assets/icons/material/contributing.svg?react';
import { ReactComponent as MuiSvgSvg } from '@/assets/icons/material/svg.svg?react';
import { ReactComponent as MuiCsvSvg } from '@/assets/icons/material/table.svg?react';
import { ReactComponent as MuiNewDocumentSvg } from '@/assets/icons/material/template.svg?react';
import { ReactComponent as MuiPowerShellSvg } from '@/assets/icons/material/powershell.svg?react';
import { ReactComponent as MuiTagAnalyzerSvg } from '@/assets/icons/material/roadmap.svg?react';
import { ReactComponent as MuiTagAnalyzerGraySvg } from '@/assets/icons/material/roadmap-gray.svg?react';
import { ReactComponent as MuiTqlSvg } from '@/assets/icons/material/log.svg?react';
import { ReactComponent as MuiFolderSvg } from '@/assets/icons/material/folder.svg?react';
import { ReactComponent as MuiFolderOpenSvg } from '@/assets/icons/material/folder-open.svg?react';
import { ReactComponent as MuiFolderGitSvg } from '@/assets/icons/material/folder-git.svg?react';
import { ReactComponent as MuiFolderGitOpenSvg } from '@/assets/icons/material/folder-git-open.svg?react';
import { ReactComponent as MuiFolderLayOutSvg } from '@/assets/icons/material/folder-layout.svg?react';
import { ReactComponent as MuiFolderLayOutOpenSvg } from '@/assets/icons/material/folder-layout-open.svg?react';

/**
 * The file-type icons keep the Material icon colours (yellow folders, a grey document): they say
 * what a thing is. Each SVG reads its colour from a token (`var(--neo-icon-folder, #ffca28)`, …), so
 * a theme can set it; a light scheme starts from deeper shades (global.scss) — drawn for a dark page,
 * the yellow and grey all but vanished on a light one.
 */
type SvgComponent = FunctionComponent<SVGProps<SVGSVGElement>>;
const typeIcon = (aSvg: SvgComponent): SvgComponent => {
    const Icon = (aProps: ComponentProps<SvgComponent>) => {
        const Svg = aSvg;
        return <Svg {...aProps} className={aProps.className ? `neo-type-icon neo-type-icon--tokens ${aProps.className}` : 'neo-type-icon neo-type-icon--tokens'} />;
    };
    Icon.displayName = aSvg.displayName ?? aSvg.name;
    return Icon;
};

export const MuiShell = typeIcon(MuiShellSvg);
export const MuiSql = typeIcon(MuiSqlSvg);
export const MuiDocument = typeIcon(MuiDocumentSvg);
export const MuiImage = typeIcon(MuiImageSvg);
export const MuiJson = typeIcon(MuiJsonSvg);
export const MuiMarkdown = typeIcon(MuiMarkdownSvg);
export const MuiWorksheet = typeIcon(MuiWorksheetSvg);
export const MuiSvg = typeIcon(MuiSvgSvg);
export const MuiCsv = typeIcon(MuiCsvSvg);
export const MuiNewDocument = typeIcon(MuiNewDocumentSvg);
export const MuiPowerShell = typeIcon(MuiPowerShellSvg);
export const MuiTagAnalyzer = typeIcon(MuiTagAnalyzerSvg);
export const MuiTagAnalyzerGray = typeIcon(MuiTagAnalyzerGraySvg);
export const MuiTql = typeIcon(MuiTqlSvg);
export const MuiFolder = typeIcon(MuiFolderSvg);
export const MuiFolderOpen = typeIcon(MuiFolderOpenSvg);
export const MuiFolderGit = typeIcon(MuiFolderGitSvg);
export const MuiFolderGitOpen = typeIcon(MuiFolderGitOpenSvg);
export const MuiFolderLayOut = typeIcon(MuiFolderLayOutSvg);
export const MuiFolderLayOutOpen = typeIcon(MuiFolderLayOutOpenSvg);
