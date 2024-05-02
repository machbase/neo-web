import { getFileList } from '@/api/repository/api';
import { fileTreeParser } from './fileTreeParser';

export const UpdateTree = async ({ path, name }: { path: string; name: string }) => {
    const sPath = path.replace(name, '');
    const sDepth = sPath.split('/').length - 1;
    const sParent = sPath
        .split('/')
        .filter((aPath: string) => aPath !== '')
        .at(-1);
    if (sParent) {
        const sRes = await getFileList('', sPath, '');
        return fileTreeParser(sRes.data, `${sPath}`, sDepth - 1, sParent);
    } else return undefined;
};
