import { QueueEntryPriority, type TagColor, type TagType } from '../../types/types';

export function getTagType(val: number | string): TagType {
  if (val === 1 || val === '1') {
    return 'green';
  } else {
    return 'red';
  }
}

export const getTagTypeByPriority = (priority: string): TagColor => {
  let type: TagColor;
  switch (priority) {
    case QueueEntryPriority.Emergency:
      type = 'red';
      break;
    case QueueEntryPriority.Normal:
      type = 'blue';
      break;
    case `${QueueEntryPriority.Emergency} PRIORITY`:
      type = 'red';
      break;
    case `${QueueEntryPriority.Normal} PRIORITY`:
      type = 'blue';
      break;
    default:
      type = 'gray';
  }
  return type;
};
