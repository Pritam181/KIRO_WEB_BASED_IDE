import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('http://localhost:5001/health', {
        method: 'GET',
        timeout: 5000,
      });
      setIsConnected(response.ok);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check connection immediately
    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isConnected) {
    return (
      <div className={`flex items-center gap-2 text-green-600 dark:text-green-400 ${className}`}>
        <Wifi className="w-4 h-4" />
        <span className="text-xs">Connected</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <WifiOff className="w-4 h-4" />
        <span className="text-xs">Backend Offline</span>
      </div>
      
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-red-700 dark:text-red-300 font-medium">
              Cannot connect to backend server
            </p>
            <p className="text-red-600 dark:text-red-400 mt-1">
              Make sure the backend server is running on port 5001.
            </p>
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
              <p>To start the backend:</p>
              <code className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded mt-1 block">
                npm run dev
              </code>
            </div>
            <button
              onClick={checkConnection}
              disabled={isChecking}
              className="mt-2 px-3 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded transition-colors"
            >
              {isChecking ? 'Checking...' : 'Retry Connection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};