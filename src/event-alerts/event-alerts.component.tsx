import React, { useEffect, useState } from 'react';
import '@carbon/styles/css/styles.css';
import styles from './event-alerts.component.scss';
import { type DetectedIssueBundleEntry, type DetetectedIssesDto, type EventAlertData } from './types/index';
import { fetchDetectedIssues } from './events-alerts.resource';
import EventAlert from './event-alert/event-alert.component';
import { formatToTitleCase } from '../shared/utils/format-title-case';


function EventAlerts() {
  const [alerts,setAlerts] = useState<EventAlertData[]>([]);
  const [eventBubdleEntry,setEventBundleEntry]= useState<DetectedIssueBundleEntry[]>([]);

  useEffect(()=>{
    getDetectedIssues();
  },[]);

  async function getDetectedIssues(){
    const payload = getDetectedIssuesPayload();
    /*
    const resp = await fetchDetectedIssues(payload);
    if(resp){
      setEventBundleEntry(resp);
    }
      */
  }
  function getDetectedIssuesPayload(): DetetectedIssesDto{
    return {
      startDate: '2026-01-01',
      endDate: '2026-11-19'
    }
  }
  function formatEventTitle(eventId: string){
     let eventTitle = '';
     if(!eventId){
         return eventTitle;
     }
     const eventIdArr = eventId.split('-');
     if(eventIdArr.length > 2){
           eventTitle = `${eventIdArr[1]} ${eventIdArr[0]} :`
     } 
     return formatToTitleCase(eventTitle);
  }

  return (
    <div className={styles.alertList}>
      {
        eventBubdleEntry && eventBubdleEntry.length > 0 ? (<>
          
           {
            eventBubdleEntry.map((b)=>{
               return <EventAlert 
                    title={formatEventTitle(b.resource.id)}
                    message={b?.resource?.detail ?? ''}
                    kind='warning'
                    />
            })
           }
        
        </>): (<></>)
      }
      
    </div>
  );
}

export default EventAlerts;