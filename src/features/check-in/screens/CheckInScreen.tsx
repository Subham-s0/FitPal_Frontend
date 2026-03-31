import React, { useState } from 'react';
import CheckInScanner from '../components/CheckInScanner';
import CheckInLogs from '../components/CheckInLogs';

type CheckInView = 'scanner' | 'logs';

interface CheckInScreenProps {
  onBack?: () => void;
}

const CheckInScreen: React.FC<CheckInScreenProps> = ({ onBack }) => {
  const [view, setView] = useState<CheckInView>('scanner');

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
