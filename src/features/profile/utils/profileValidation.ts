const NEPAL_MOBILE_REGEX = /^(98|97)\d{8}$/;
const USERNAME_REGEX = /^[A-Za-z0-9_]+$/;
const NAME_MAX_LENGTH = 100;

export function validateUsername(value: string): string | null {
  const normalized = value.trim();

  if (!normalized) return "Username is required";
  if (normalized.length < 3) return "At least 3 characters";
  if (normalized.length > 50) return "At most 50 characters";
  if (!USERNAME_REGEX.test(normalized)) {
    return "Letters, numbers, and underscores only";
  }

  return null;
}

export function validatePhone(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  return NEPAL_MOBILE_REGEX.test(normalized)
    ? null
    : "Must start with 98 or 97 and be exactly 10 digits";
}

export function validatePastDate(value: string): string | null {
  if (!value) return null;

  const dob = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dob.getTime()) || dob >= new Date()) {
    return "Must be a past date";
  }

  return null;
}

export function validateHeight(value: string): string | null {
  if (!value) return null;

  const height = Number(value);
  if (Number.isNaN(height) || height < 80 || height > 280) {
    return "Between 80 and 280 cm";
  }

  return null;
}

export function validateWeight(value: string): string | null {
  if (!value) return null;

  const weight = Number(value);
  if (Number.isNaN(weight) || weight < 20 || weight > 300) {
    return "Between 20 and 300 kg";
  }

  return null;
}

export function validateName(value: string, label: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > NAME_MAX_LENGTH) {
    return `${label} must be at most ${NAME_MAX_LENGTH} characters`;
  }
  return null;
}

export function validateAtLeastOneName(firstName: string, lastName: string): string | null {
  if (!firstName.trim() && !lastName.trim()) {
    return "Add your first name or last name";
  }
  return null;
}
