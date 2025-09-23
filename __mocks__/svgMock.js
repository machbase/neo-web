// __mocks__/svgMock.js
const React = require('react');

const ReactComponent = React.forwardRef((props, ref) => {
    return React.createElement('svg', {
        ...props,
        ref: ref,
        'data-testid': 'mocked-svg',
    });
});

ReactComponent.displayName = 'MockedSVG';

module.exports = {
    ReactComponent: ReactComponent,
    default: ReactComponent,
    __esModule: true,
};
