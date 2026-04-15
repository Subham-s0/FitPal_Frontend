import React, { useEffect, useState } from 'react';
import CheckInScanner from '../components/CheckInScanner';
import CheckInLogs from '../components/CheckInLogs';

type CheckInView = 'scanner' | 'logs';

interface CheckInScreenProps {
  onBack?: () => void;
  initialView?: CheckInView;
}

const CheckInScreen: React.FC<CheckInScreenProps> = ({ initialView = 'scanner' }) => {
  const [view, setView] = useState<CheckInView>(initialView);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  return (
    <div className="w-full min-h-full">
      {view === 'scanner' ? (
        <CheckInScanner onBack={() => setView('logs')} />
      ) : (
        <CheckInLogs onBack={() => setView('scanner')} />
      )}
    </div>
  );
};

export default CheckInScreen;
