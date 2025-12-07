import { Button } from "@carbon/react";
import { useLayoutType, isDesktop } from "@openmrs/esm-framework";
import { useTranslation } from "react-i18next";
import React from "react";
import { useActionPropsByKey } from "../hooks/useActions";
import { type QueueEntryAction } from "../config-schema";
import { type QueueEntry } from "../types/types";

export function ActionButton({ actionKey, queueEntry }: { actionKey: QueueEntryAction; queueEntry: QueueEntry }) {
  const { t } = useTranslation();
  const layout = useLayoutType();
  const actionPropsByKey = useActionPropsByKey();

  const actionProps = actionPropsByKey[actionKey];
  if (!actionProps) {
    console.error(`Service queue table configuration uses unknown action in 'action.buttons': ${actionKey}`);
    return null;
  }

  if (actionProps.showIf && !actionProps.showIf(queueEntry)) {
    return null;
  }

  return (
    <Button
      key={actionKey}
      kind="ghost"
      aria-label={t(actionProps.label, actionProps.text)}
      onClick={() => actionProps.onClick(queueEntry)}
      size={isDesktop(layout) ? 'sm' : 'lg'}>
      {t(actionProps.label, actionProps.text)}
    </Button>
  );
}