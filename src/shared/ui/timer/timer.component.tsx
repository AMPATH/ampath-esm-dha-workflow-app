import React, { useEffect, useState } from 'react';
import styles from './timer.component.scss';

interface TimerProps {
  durationInSeconds: number;
  resetTimer: () => void;
  onTimeUp: () => void;
}
const Timer: React.FC<TimerProps> = ({ durationInSeconds, resetTimer, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(durationInSeconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp?.();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const convertToMinsAndSeconds = (timeInSeconds: number) => {
    const min = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    const formatedMin = min > 9 ? min : `0${min}`;
    const formattedSec = seconds > 9 ? seconds : `0${seconds}`;
    return `${formatedMin}:${formattedSec}`;
  };
  return (
    <>
      <div className={styles.timerData}>
        <b>{convertToMinsAndSeconds(timeLeft)}</b>
      </div>
    </>
  );
};
export default Timer;
