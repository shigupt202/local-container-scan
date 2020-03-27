const PIPE = '|';

export function getTableHeader(titles: string[]): string {
    const titleCount = titles.length;
    const dashesArray = new Array(titleCount).fill('---');
    return `${titles.join(PIPE)}\n${dashesArray.join(PIPE)}`;
}

export function getTableRow(values: string[], bold?: boolean): string {
    const processedValues = values.map(v => getProcessedValue(v, bold));
    return `${processedValues.join(PIPE)}`;
}

function getProcessedValue(value: string, bold?: boolean): string {
    return bold ? `**${value}**` : value;
}