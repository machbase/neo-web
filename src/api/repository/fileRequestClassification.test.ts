import {isUncertainFileResult} from '@/api/repository/fileWriteQueue';
import {getFileRequestFailure} from '@/utils/fileRequestResult';

const text = JSON.stringify({success: false, reason: 'destination exists'});
const bytes = new TextEncoder().encode(text);
for (const [label, body] of [['object', JSON.parse(text)], ['text', text], ['buffer', bytes.buffer], ['view', bytes], ['data-view', new DataView(bytes.buffer)]] as const) {
    test(`a terminal Neo rejection is known when its body is ${label}`, () => {
        const response = {status: 500, headers: {}, data: body};
        expect(getFileRequestFailure(response)).toEqual({reason: 'destination exists', transport: false});
        expect(isUncertainFileResult(response)).toBe(false);
    });
}
for (const status of [502, 503, 504]) test(`gateway ${status} remains unknown even with a JSON error envelope`, () => {
    expect(isUncertainFileResult({status, headers: {}, data: bytes})).toBe(true);
});
test('an unrecognized server failure is still not a completion proof', () => {
    expect(isUncertainFileResult({status: 500, headers: {}, data: 'connection to upstream failed'})).toBe(true);
});
