import { useEffect, useState } from 'react';
import { archiveDateKey } from '@/utils/progressAnalytics';

export function useArchiveToday() {
  const [today, setToday] = useState(() => archiveDateKey(new Date())!);
  useEffect(() => {
    const timer = setInterval(() => setToday(archiveDateKey(new Date())!), 30000);
    return () => clearInterval(timer);
  }, []);
  return today;
}
