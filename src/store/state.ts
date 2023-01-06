const state = {
    /* Global */
    gDarkMode: true as boolean,
    gActiveHeader: false as boolean,
};

type RootState = typeof state;

export { state, RootState };
