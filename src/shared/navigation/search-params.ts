const hasAllowedValue = <T extends string>(value: string | null, allowedValues: readonly T[]): value is T =>
  value !== null && allowedValues.includes(value as T);

export const readEnumSearchParam = <T extends string>(
  search: string,
  key: string,
  allowedValues: readonly T[],
  fallbackValue: T,
) => {
  const value = new URLSearchParams(search).get(key);
  return hasAllowedValue(value, allowedValues) ? value : fallbackValue;
};

export const readOptionalEnumSearchParam = <T extends string>(
  search: string,
  key: string,
  allowedValues: readonly T[],
) => {
  const value = new URLSearchParams(search).get(key);
  return hasAllowedValue(value, allowedValues) ? value : null;
};

export const writeSearchParam = (
  search: string,
  key: string,
  value: string | null | undefined,
) => {
  const params = new URLSearchParams(search);

  if (!value) {
    params.delete(key);
  } else {
    params.set(key, value);
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};
