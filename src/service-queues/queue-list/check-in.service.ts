export const CHECKIN_KEY = 'checkin';
export const checkInRoom = (providerUuid: string, queueRoom: string) => {
  const checkInVal = formatCheckinValue(providerUuid, queueRoom);
  localStorage.setItem(CHECKIN_KEY, checkInVal);
};

const formatCheckinValue = (providerUuid: string, queueRoom: string): string => {
  return (queueRoom + providerUuid).replaceAll(' ', '');
};

export const getCheckinValue = (): string | null => {
  return localStorage.getItem(CHECKIN_KEY) ?? null;
};

export const checkOutRoom = () => {
  localStorage.removeItem(CHECKIN_KEY);
};

export const isCheckedIn = (providerUuid: string, queueRoom): boolean => {
  if (!providerUuid || !queueRoom) {
    return false;
  }
  const checkInVal = formatCheckinValue(providerUuid, queueRoom);
  const cachedCheckedInVal = getCheckinValue();
  return checkInVal === cachedCheckedInVal;
};
