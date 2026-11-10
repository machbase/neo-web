import { fireEvent, render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import Console from './index';
import { gWsLog } from '@/recoil/websocket';

jest.mock('../shell/Shell', () => () => null);

const LOGS = [
    { timestamp: 1762412000000, level: 'INFO', task: 'job-a', message: 'a one' },
    { timestamp: 1762412001000, level: 'WARN', task: 'job-b', message: 'b one' },
    { timestamp: 1762412002000, level: 'INFO', task: 'job-a', message: 'a two' },
    { timestamp: 1762412003000, level: '', task: '', message: 'c one' },
    { timestamp: 1762412004000, level: '', task: '', message: 'c two' },
];

const renderConsole = () =>
    render(
        <RecoilRoot initializeState={({ set }) => set(gWsLog, LOGS as any)}>
            <Console pSetTerminalSizes={() => {}} pExtentionList={[]} pTerminalSizes={['72%', '28%']} />
        </RecoilRoot>
    );

const line = (aMessage: string) => screen.getByText(aMessage).closest('.task') as HTMLElement;
const selected = (aMessage: string) => line(aMessage).dataset.selected === 'true';

// A click on a log line selects that line alone (its task's other lines, or the other lines without a task, stay
// as they are); a click on it again lets it go.
test('a click selects the line clicked, and only it; a click on it again lets it go', () => {
    renderConsole();
    expect(selected('a one')).toBe(false);

    fireEvent.click(line('a one'));
    expect(['a one', 'a two', 'b one', 'c one', 'c two'].map(selected)).toEqual([true, false, false, false, false]);

    // another line: the selection moves to it
    fireEvent.click(line('b one'));
    expect(['a one', 'b one'].map(selected)).toEqual([false, true]);

    // the same line again: nothing is selected
    fireEvent.click(line('b one'));
    expect(['a one', 'a two', 'b one'].map(selected)).toEqual([false, false, false]);

    // two lines without a task are two lines
    fireEvent.click(line('c one'));
    expect(['c one', 'c two'].map(selected)).toEqual([true, false]);
});

// A click anywhere but on a log line lets the selected line go — another part of the page, or the console's own
// empty space; a click on another line moves the selection rather than letting it go.
test('a click anywhere but on a log line lets the selected line go', () => {
    renderConsole();
    fireEvent.click(line('a one'));
    expect(selected('a one')).toBe(true);

    fireEvent.click(document.body);
    expect(selected('a one')).toBe(false);

    fireEvent.click(line('a two'));
    fireEvent.click(line('b one'));
    expect(['a two', 'b one'].map(selected)).toEqual([false, true]);

    // the console's own space below its lines
    fireEvent.click(document.querySelector('.is-console') as HTMLElement);
    expect(selected('b one')).toBe(false);
});
