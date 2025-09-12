// CSV
export const SavedToCSV = (saveName: string, data: any[], visibleList: { name: string; visible: boolean }[], callback: any) => {
    if (!saveName || saveName === '') return;
    if (!data || data?.length === 0) return;
    let sData: string = '';
    const sVisibleNameList: string[] = [];
    visibleList.map((vItem) => {
        if (vItem && vItem.visible) sVisibleNameList.push(vItem?.name);
    });
    data.map((item: any) => {
        item.data &&
            item.data.length > 0 &&
            sVisibleNameList.includes(item.name) &&
            item.data.map((series: any) => {
                sData += `${item.name}, ${series.join(', ')}\n`;
            });
    });
    const sBlob = new Blob([sData], { type: `text/csv` });
    const sLink = document.createElement('a');
    sLink.href = URL.createObjectURL(sBlob);
    sLink.setAttribute('download', saveName);
    sLink.click();
    URL.revokeObjectURL(sLink.href);
    callback();
};
