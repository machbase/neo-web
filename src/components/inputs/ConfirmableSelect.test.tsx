// Chart type picker in the panel editor: switching to the confirm trigger asks first.
// Covers: dsh-type-change-geomap-confirm, dsh-type-change-geomap-accept.
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmableSelect } from './ConfirmableSelect';

const OPTIONS = ['Line', 'Bar', 'Geomap'];

const renderSelect = (aUseConfirmRule = true) => {
    const onChange = jest.fn();
    const Host = () => {
        const [sValue, setValue] = useState('Line');
        return (
            <ConfirmableSelect
                pOptions={OPTIONS}
                pValue={sValue}
                pConfirmTrigger="Geomap"
                pConfirmMessage="Changing to geomap type will remove transform data."
                pUseConfirmRule={aUseConfirmRule}
                onChange={(aEvent) => {
                    onChange(aEvent.target.value);
                    setValue(aEvent.target.value);
                }}
                data-testid="chart-type"
                menuTestId="type-menu"
                confirmTestId="type-confirm"
            />
        );
    };
    render(<Host />);
    return onChange;
};

const choose = (aValue: string) => {
    fireEvent.click(screen.getByTestId('chart-type'));
    fireEvent.click(screen.getByTestId(`option-${encodeURIComponent(aValue)}`));
};

describe('ConfirmableSelect', () => {
    it('changes at once to an option that needs no confirmation', () => {
        const onChange = renderSelect();
        choose('Bar');

        expect(onChange).toHaveBeenCalledWith('Bar');
        expect(screen.queryByTestId('type-confirm')).not.toBeInTheDocument();
        expect(screen.getByTestId('chart-type')).toHaveTextContent('Bar');
    });

    it('keeps the current value when the confirmation is cancelled', () => {
        const onChange = renderSelect();
        choose('Geomap');
        expect(screen.getByTestId('type-confirm')).toHaveTextContent('Changing to geomap type will remove transform data.');

        fireEvent.click(screen.getByTestId('cancel'));

        expect(screen.queryByTestId('type-confirm')).not.toBeInTheDocument();
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByTestId('chart-type')).toHaveTextContent('Line');
    });

    it('changes to the trigger when the confirmation is accepted', () => {
        const onChange = renderSelect();
        choose('Geomap');
        fireEvent.click(screen.getByTestId('confirm'));

        expect(screen.queryByTestId('type-confirm')).not.toBeInTheDocument();
        expect(onChange).toHaveBeenCalledWith('Geomap');
        expect(screen.getByTestId('chart-type')).toHaveTextContent('Geomap');
    });

    it('can pick another option after a cancelled confirmation', () => {
        const onChange = renderSelect();
        choose('Geomap');
        fireEvent.click(screen.getByTestId('cancel'));
        choose('Bar');

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('Bar');
        expect(screen.getByTestId('chart-type')).toHaveTextContent('Bar');
    });

    it('changes to the trigger without asking when the rule is off', () => {
        const onChange = renderSelect(false);
        choose('Geomap');

        expect(screen.queryByTestId('type-confirm')).not.toBeInTheDocument();
        expect(onChange).toHaveBeenCalledWith('Geomap');
    });
});
