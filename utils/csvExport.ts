
export const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        console.warn("No data to export");
        return;
    }

    // Extract headers
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
            const value = row[fieldName];
            // Handle strings with commas by wrapping in quotes
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(','))
    ].join('\n');

    // Create Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
