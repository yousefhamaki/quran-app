import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** Reachability from the OS (more reliable than a simple "connected" flag: Wi-Fi without internet counts as offline). */
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener(state => setOnline(!!state.isConnected && state.isInternetReachable !== false)), []);
  return online;
}
