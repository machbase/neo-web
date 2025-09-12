/**
 * ClipboardCopy
 * @param copyTxt - copy text
 */
export const ClipboardCopy = (copyTxt: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = copyTxt;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
};
