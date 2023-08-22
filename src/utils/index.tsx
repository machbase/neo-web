import React from 'react';
import { buildFileTree, Directory } from './file-manager';

export const useFilesFromSandbox = (id: string, callback: (dir: Directory) => void) => {
    React.useEffect(() => {
        fetch('https://codesandbox.io/api/v1/sandboxes/' + id)
            .then((response) => response.json())
            .then(({ data }) => {
                console.log('origin data', data);
                const rootDir = buildFileTree(data);
                console.log('root dir', rootDir);
                callback(rootDir);
            });
    }, []);
};

export const getId = () => {
    return new Date().getTime() + (Math.random() * 1000).toFixed();
};

export const isValidJSON = (aString: string) => {
    try {
        JSON.parse(aString);
        return true;
    } catch (error) {
        return false;
    }
};
