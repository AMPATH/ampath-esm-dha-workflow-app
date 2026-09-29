import React, { useMemo } from "react";
import styles from './claim-stat.component.scss';
import { formatToTitleCase } from "../../../../../shared/utils/format-title-case";
import { type ClaimVisit } from "src/billing/types";
interface claimStat {
    title: any;
    onStatClick: (title: string)=> void;
    claimVisits: ClaimVisit[]
}
const ClaimStat: React.FC<claimStat> = ({title,onStatClick,claimVisits})=>{
  const claimCount = claimVisits.length;
  const totalValue = useMemo(()=>calculateTotal(claimVisits),[claimVisits]);
  function handleStatClick(){
     onStatClick(title);
  }
  function calculateTotal(claimVisits: ClaimVisit[]) {
  if (!Array.isArray(claimVisits)) return 0;

  return claimVisits.reduce((sum, item: ClaimVisit) => {
    const amount = Number(item?.totalClaimAmount) || 0;
    return sum + amount;
  }, 0);
}
  
  return <>
    <div className={styles.claimStatLayout}>
       <div className={styles.claimStatHeader}>
           <h5 className={styles.statsTitle}>{title ? formatToTitleCase(title) : ''}</h5>
       </div>
       <div className={styles.claimStatContent}>
            <div className={styles.claimStatCount}>
               <h3 className={styles.navStat} onClick={handleStatClick}>{claimCount ?? 0}</h3>
            </div>
            <div className={styles.claimValue}>
                 <h6>KES {totalValue ?? 0}</h6>
            </div>
       </div>
    </div>
  </>
}
export default ClaimStat;