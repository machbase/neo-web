import * as React from 'react';
import './MultiSelector.scss';
import { Theme, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import OutlinedInput from '@mui/material/OutlinedInput';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import { Input } from './Input';
import { ArrowDown } from '@/assets/icons/Icon';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

const names = [
    'Oliver Hansen',
    'Van Henry',
    'April Tucker',
    'Ralph Hubbard',
    'Omar Alexander',
    'Carlos Abbott',
    'Miriam Wagner',
    'Bradley Wilkerson',
    'Virginia Andrews',
    'Kelly Snyder',
];

function getStyles(name: string, personName: readonly string[], theme: Theme) {
    return {
        fontWeight: personName.includes(name) ? theme.typography.fontWeightMedium : theme.typography.fontWeightRegular,
    };
}

interface MultiSelectorItemProps {
    item: { name: string; color: string; idx: number };
}

const MultiSelectorItem: React.FC<MultiSelectorItemProps> = ({ item }) => {
    console.log('item', item);
    return (
        //  border-bottom: 2px inset #005fb8;
        <div className="multi-selector-item" style={{ inset: 'left 1px 1px 1px 1px', backgroundColor: item.color }}>
            <span>{item.name}</span>
        </div>
    );
};

export const MultipleSelect = ({ pPanelOption }: { pPanelOption: any }) => {
    console.log('pPanelOption', pPanelOption);
    const [personName, setPersonName] = React.useState<string[]>([]);

    const handleChange = (event: SelectChangeEvent<typeof personName>) => {
        const {
            target: { value },
        } = event;
        setPersonName(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value
        );
    };

    const getBlockList = React.useMemo((): any[] => {
        const sTmpBlockList = pPanelOption.blockList.map((block: any, idx: number) => {
            return { name: block.table, color: block.color, idx: idx };
        });
        return sTmpBlockList;
    }, [pPanelOption.blockList]);

    const test = ['aaaaaaaa', 'bbbbbbb', 'c', 'eifjedddddfdfd', 'eifdjdddddddfksdf'];

    console.log('getBlockList', getBlockList);

    return (
        <div className="multi-selector">
            <div className="multi-selector-selected-box">
                <div className="multi-selector-selected-items">
                    {getBlockList.map((item: { name: string; color: string; idx: number }) => (
                        <MultiSelectorItem key={item.name} item={item} />
                    ))}
                </div>
                <ArrowDown />
            </div>
            {/* <FormControl>
                <Select
                    labelId="multiple-chip-label"
                    id="multiple-chip"
                    multiple
                    value={personName}
                    onChange={handleChange}
                    renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                                <Chip key={value} label={value} />
                            ))}
                        </Box>
                    )}
                    MenuProps={MenuProps}
                >
                    {names.map((name) => (
                        <MenuItem key={name} value={name} style={getStyles(name, personName, theme)}>
                            {name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl> */}
        </div>
    );
};
