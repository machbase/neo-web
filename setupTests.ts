import '@testing-library/jest-dom';
import { TextEncoder } from 'node:util';

if (typeof global.TextEncoder === 'undefined') {
    (global as any).TextEncoder = TextEncoder;
}
