import 'split-pane-react/esm/themes/default.css';
import './index.scss';
import SplitPaneLib, { Pane as PaneLib } from 'split-pane-react';
import { ComponentProps } from 'react';

// Re-export Pane component
export const Pane = PaneLib;

// Custom SplitPane wrapper with styled sash
type SplitPaneLibProps = ComponentProps<typeof SplitPaneLib>;

export type SplitPaneProps = Omit<SplitPaneLibProps, 'sashRender'> & {
    sashRender?: SplitPaneLibProps['sashRender'];
};

export const SplitPane = ({ sashRender, split = 'vertical', ...restProps }: SplitPaneProps) => {
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

    return <SplitPaneLib {...restProps} split={split} sashRender={wrappedSashRender} />;
};
