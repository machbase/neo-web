import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from '../components/Modal';
import { Dropdown } from '../components/Dropdown';
import { Combobox } from '../components/Combobox';
import { InputSelect } from '../components/InputSelect';
import useEsc from '@/hooks/useEsc';

const OPTIONS = [
    { label: 'AVG', value: 'avg' },
    { label: 'SUM', value: 'sum' },
];

const DropdownField = () => (
    <Dropdown.Root options={OPTIONS} value="avg" onChange={() => {}}>
        <Dropdown.Trigger data-testid="dropdown-trigger" />
        <Dropdown.Menu>
            <Dropdown.List />
        </Dropdown.Menu>
    </Dropdown.Root>
);

const ComboboxField = () => (
    <Combobox.Root options={OPTIONS} value="avg" onChange={() => {}} searchable>
        <Combobox.Input data-testid="combobox-input" />
        <Combobox.Dropdown>
            <Combobox.List />
        </Combobox.Dropdown>
    </Combobox.Root>
);

const InputSelectField = () => <InputSelect type="text" options={OPTIONS} defaultValue="avg" data-testid="input-select" />;

/** Something on the page behind that listens for Escape everywhere (an inline table edit) and marks it handled. */
const PageEscListener = ({ pOnEsc }: { pOnEsc: () => void }) => {
    useEsc(pOnEsc);
    return null;
};

const renderInModal = (aField: JSX.Element, aOnPageEsc: () => void = () => {}) => {
    const onClose = jest.fn();
    render(
        <>
            <PageEscListener pOnEsc={aOnPageEsc} />
            <Modal.Root isOpen onClose={onClose} data-testid="dialog">
                <Modal.Body>{aField}</Modal.Body>
            </Modal.Root>
        </>
    );
    return onClose;
};

describe('Escape on a list inside a dialog (F-158)', () => {
    it('closes an open dropdown list and keeps the dialog; a second Escape closes the dialog', () => {
        const onClose = renderInModal(<DropdownField />);
        const sTrigger = screen.getByTestId('dropdown-trigger');

        fireEvent.click(sTrigger);
        expect(sTrigger).toHaveAttribute('aria-expanded', 'true');

        fireEvent.keyDown(sTrigger, { key: 'Escape' });
        expect(sTrigger).toHaveAttribute('aria-expanded', 'false');
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.keyDown(sTrigger, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes an open combobox list and keeps the dialog; a second Escape closes the dialog', () => {
        const onClose = renderInModal(<ComboboxField />);
        const sInput = screen.getByTestId('combobox-input');

        fireEvent.keyDown(sInput, { key: 'ArrowDown' });
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        fireEvent.keyDown(sInput, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.keyDown(sInput, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes an open input select list and keeps the dialog; a second Escape closes the dialog', () => {
        const onClose = renderInModal(<InputSelectField />);
        const sTrigger = screen.getByRole('button', { name: 'Toggle options' });

        fireEvent.keyDown(sTrigger, { key: 'ArrowDown' });
        expect(screen.getByRole('listbox')).toBeInTheDocument();

        fireEvent.keyDown(sTrigger, { key: 'Escape' });
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.keyDown(sTrigger, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('still closes the dialog on Escape when no list is open, though the page marks every Escape handled', () => {
        const onPageEsc = jest.fn();
        const onClose = renderInModal(<DropdownField />, onPageEsc);

        fireEvent.keyDown(document.body, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onPageEsc).toHaveBeenCalledTimes(1);
    });

    it('keeps an open list\'s Escape from the page\'s own Escape listeners', () => {
        const onPageEsc = jest.fn();
        renderInModal(<DropdownField />, onPageEsc);
        const sTrigger = screen.getByTestId('dropdown-trigger');

        fireEvent.click(sTrigger);
        fireEvent.keyDown(sTrigger, { key: 'Escape' });
        expect(onPageEsc).not.toHaveBeenCalled();
    });

    it('closes a dropdown list on Escape outside any dialog', () => {
        render(<DropdownField />);
        const sTrigger = screen.getByTestId('dropdown-trigger');

        fireEvent.click(sTrigger);
        fireEvent.keyDown(sTrigger, { key: 'Escape' });
        expect(sTrigger).toHaveAttribute('aria-expanded', 'false');
    });
});
