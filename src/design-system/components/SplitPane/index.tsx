import 'split-pane-react/esm/themes/default.css';
import './index.scss';
import SplitPaneLib, { Pane as PaneLib } from 'split-pane-react';
import { cloneElement, isValidElement, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

type PaneProps = ComponentProps<typeof PaneLib> & {
    /** Names this pane's error boundary (card test ID `error-boundary-<name>`); defaults to `pane:<index>`. */
    boundaryName?: string;
};

// The library's own component, only typed wider: SplitPane finds its panes by `type === Pane`, so a
// wrapper component here would lose every pane's min/max size.
export const Pane = PaneLib as ComponentType<PaneProps>;

/**
 * Each pane keeps its own failure (#1547): a list and its detail form, an editor and its result,
 * the panel editor's preview, series and options — one breaking leaves the others usable. The
 * boundary goes inside the pane, so the pane itself (its size, the sash) is untouched.
 */
const isolatePanes = (aChildren: ReactNode) =>
    Array.isArray(aChildren)
        ? aChildren.map((aChild, aIdx) => {
              if (!isValidElement(aChild)) return aChild;
              const sName = (aChild.props as PaneProps).boundaryName ?? `pane:${aIdx}`;
              if (aChild.type === PaneLib) {
                  // The panes become an array here, so each needs a key like the wrapped children below.
                  return cloneElement(aChild, { key: aChild.key ?? aIdx }, <ErrorBoundary name={sName} variant="region">{(aChild.props as PaneProps).children}</ErrorBoundary>);
              }
              return (
                  <ErrorBoundary key={aChild.key ?? aIdx} name={sName} variant="region">
                      {aChild}
                  </ErrorBoundary>
              );
          })
        : aChildren;

// Custom SplitPane wrapper with styled sash
type SplitPaneLibProps = ComponentProps<typeof SplitPaneLib>;

export type SplitPaneProps = Omit<SplitPaneLibProps, 'sashRender'> & {
    sashRender?: SplitPaneLibProps['sashRender'];
};

export const SplitPane = ({ sashRender, split = 'vertical', children, ...restProps }: SplitPaneProps) => {
    // Default sashRender with custom styling
    const defaultSashRender = () => {
        return (
            <div className="custom-split-sash">
                <div className={`custom-split-sash-line custom-split-sash-line--${split}`} />
            </div>
        );
    };

    // Wrap custom sashRender with our custom classes
    const wrappedSashRender = sashRender
        ? (...args: Parameters<NonNullable<SplitPaneLibProps['sashRender']>>) => {
              const customContent = sashRender(...args);
              return (
                  <div className="custom-split-sash">
                      <div className={`custom-split-sash-line custom-split-sash-line--${split}`}>{customContent}</div>
                  </div>
              );
          }
        : defaultSashRender;

    return <SplitPaneLib {...restProps} split={split} sashRender={wrappedSashRender} children={isolatePanes(children) as SplitPaneLibProps['children']} />;
};
