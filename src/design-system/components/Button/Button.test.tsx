import { render, screen } from '@testing-library/react';
import { Button, IconButton } from './index';

const Icon = () => <svg data-testid="icon" />;

// F-92: icon buttons with a tooltip had no name of their own — screen readers read "button" for
// Run code, Save and the like. The tooltip text is their name now, unless the caller gave one.
describe('Button name from its tooltip (F-92)', () => {
    it('names an icon button after its tooltip text', () => {
        render(<Button isToolTip toolTipContent="Run code" icon={<Icon />} variant="ghost" size="icon" />);
        expect(screen.getByRole('button', { name: 'Run code' })).toBeInTheDocument();
    });

    it('keeps the name the caller gives', () => {
        render(<Button isToolTip toolTipContent="Save" aria-label="Save file" icon={<Icon />} />);
        expect(screen.getByRole('button')).toHaveAccessibleName('Save file');
    });

    it('keeps an IconButton\'s required name', () => {
        render(<IconButton isToolTip toolTipContent="Refresh" aria-label="Refresh list" icon={<Icon />} />);
        expect(screen.getByRole('button')).toHaveAccessibleName('Refresh list');
    });

    it('keeps a title or a label as the name', () => {
        render(
            <>
                <Button isToolTip toolTipContent="Tip" title="Titled" icon={<Icon />} />
                <Button isToolTip toolTipContent="Tip" label="Labelled" icon={<Icon />} />
            </>
        );
        expect(screen.getAllByRole('button').map((aButton) => aButton.getAttribute('aria-label'))).toEqual([null, null]);
        expect(screen.getByRole('button', { name: 'Labelled' })).toBeInTheDocument();
    });

    it('adds no name when the tooltip is not plain text', () => {
        render(<Button isToolTip toolTipContent={<b>Rich</b>} icon={<Icon />} />);
        expect(screen.getByRole('button')).not.toHaveAttribute('aria-label');
    });

    it('leaves a text button named by its text', () => {
        render(
            <Button isToolTip toolTipContent="Applies the change">
                Apply
            </Button>
        );
        expect(screen.getByRole('button')).toHaveAccessibleName('Apply');
        expect(screen.getByRole('button')).not.toHaveAttribute('aria-label');
    });

    it('adds no name without a tooltip', () => {
        render(<Button toolTipContent="Hidden" icon={<Icon />} />);
        expect(screen.getByRole('button')).not.toHaveAttribute('aria-label');
    });
});
