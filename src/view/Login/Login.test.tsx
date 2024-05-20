/**
 * ReferenceError: TextEncoder is not defined
 * https://stackoverflow.com/questions/68468203/why-am-i-getting-textencoder-is-not-defined-in-jest
 */
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; //toBeInTheDocument() 를 사용하기 위해서 필요합니다!
import Login from './Login';
const mockedUsedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...(jest.requireActual('react-router-dom') as any),
    useNavigate: () => mockedUsedNavigate,
}));

describe('Login Page', () => {
    it('render Login Page', () => {
        render(<Login />);
    });

    it('Remember User ID', () => {
        render(<Login />);
        expect(screen.getByText('Remember User ID')).toBeInTheDocument();
    });
});
