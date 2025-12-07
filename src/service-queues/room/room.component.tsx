import { Stack, InlineLoading, Tag, OverflowMenu } from "@carbon/react";
import { isDesktop, useLayoutType } from "@openmrs/esm-framework";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { MetricsCard, MetricsCardHeader, MetricsCardBody } from "../metrics/metrics-cards/metrics-card.component";
import { ActionButton } from "../action-button.component";
import { ActionOverflowMenuItem } from "../action-overflow-menu-item.component";
import { useTranslation } from "react-i18next";
import { type QueueEntryAction } from "../../config-schema";
import { useQueueEntries } from "../service-queues.resource";

interface RoomProps {
    checkedInRoomUuids: Array<string>;
    queueUuid: string;
    overflowMenuKeys: QueueEntryAction[];
    defaultMenuKey: QueueEntryAction;
}

export const Room: React.FC<RoomProps> = ({ queueUuid, overflowMenuKeys, checkedInRoomUuids = [], defaultMenuKey = 'move' }) => {
    const { t } = useTranslation();
    const { queueEntries, isLoading } = useQueueEntries(queueUuid);
    const layout = useLayoutType();
    const [checkedIn, setCheckedIn] = useState(false);

    useEffect(() => {
        if(checkedInRoomUuids.includes(queueUuid)) {
            setCheckedIn(true);
        } else {
            setCheckedIn(false);
        }
    }, [checkedInRoomUuids, queueUuid]);

    return <Stack as="div">
        {
            isLoading ? (<InlineLoading />) : queueEntries?.data?.results.map((queueEntry, index) => (
                <MetricsCard key={index}>
                    <MetricsCardHeader title={queueEntry.display} />
                    <MetricsCardBody>
                        <p>{`${t('visitTime', 'Visit time')} : ${dayjs(queueEntry.startedAt).format('YYYY-MM-DD HH:mm')}`}</p>
                        <Tag type="blue" size="sm">
                            {queueEntry.priority?.display}
                        </Tag>
                        {
                            checkedIn ? <>
                                <ActionButton key={defaultMenuKey} actionKey={defaultMenuKey} queueEntry={queueEntry} />
                                <OverflowMenu aria-label="Actions menu" size={isDesktop(layout) ? 'sm' : 'lg'} align="left" flipped>
                                    {overflowMenuKeys.map((actionKey) => (
                                        <ActionOverflowMenuItem key={actionKey} actionKey={actionKey} queueEntry={queueEntry} />
                                    ))}
                                </OverflowMenu>
                            </> : <></>
                        }
                    </MetricsCardBody>
                </MetricsCard>
            ))
        }
    </Stack>
}