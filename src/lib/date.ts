const pad = (value: number): string => value.toString().padStart(2, "0");

export const formatDateEU = (input: string | Date): string => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatDateTimeEU = (input: string | Date): string => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  const base = formatDateEU(date);
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${base} ${hours}:${minutes}`;
};
