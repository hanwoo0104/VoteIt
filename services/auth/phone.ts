export function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function formatPhone(phone: string) {
  const normalized = normalizePhone(phone);
  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
  }
  return phone.trim();
}

export function phoneToAuthEmail(phone: string) {
  const normalized = normalizePhone(phone);
  if (!/^01\d{8,9}$/.test(normalized)) {
    throw new Error("올바른 휴대폰 번호를 입력해 주세요.");
  }
  return `${normalized}@phone.voteit.local`;
}
