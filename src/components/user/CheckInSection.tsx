import React, { useState } from 'react';
import CheckInScanner from './CheckInScanner';
import CheckInLogs from './CheckInLogs';

type CheckInView = 'scanner' | 'logs';

interface CheckInSectionProps {
  onBack?: () => void;
}

const CheckInSection: React.FC<CheckInSectionProps> = ({ onBack }) => {
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

export default CheckInSection;
