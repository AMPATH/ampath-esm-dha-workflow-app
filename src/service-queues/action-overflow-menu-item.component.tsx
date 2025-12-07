import { OverflowMenuItem } from "@carbon/react";
import { useTranslation } from "react-i18next";
import React from "react";
import { type QueueEntryAction } from "../config-schema";
import { useActionPropsByKey } from "../hooks/useActions";
import { type QueueEntry } from "../types/types";
import styles from './service-queue.scss';

export function ActionOverflowMenuItem({ actionKey, queueEntry }: { actionKey: QueueEntryAction; queueEntry: QueueEntry }) {
  const { t } = useTranslation();
  const actionPropsByKey = useActionPropsByKey();

  const actionProps = actionPropsByKey[actionKey];
  if (!actionProps) {
    console.error(`Service queue table configuration uses unknown action in 'action.overflowMenu': ${actionKey}`);
    return null;
  }

  if (actionProps.showIf && !actionProps.showIf(queueEntry)) {
    return null;
  }

  return (
    <OverflowMenuItem
      key={actionKey}
      className={styles.menuItem}
      aria-label={t(actionProps.label, actionProps.text)}
      hasDivider
      isDelete={actionProps.isDelete}
      onClick={() => actionProps.onClick(queueEntry)}
      itemText={t(actionProps.label, actionProps.text)}
    />
  );
}