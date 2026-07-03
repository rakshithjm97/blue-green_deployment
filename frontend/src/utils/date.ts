export const formatTimestamp = (value?: string | number | Date): string => {
  if (value === undefined || value === null || value === '') return '-';

  const date =
    value instanceof Date
      ? value
      : typeof value === 'number'
      ? new Date(value)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString();
};
