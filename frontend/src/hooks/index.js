import React, { useEffect, useRef } from 'react';
import { useAlertStore } from '../store';

export const useWebSocketAlerts = () => {
  const wsRef = useRef(null);
  const { addAlert, resolveAlert } = useAlertStore();

  useEffect(() => {
    const wsURL = (process.env.REACT_APP_WS_URL || 'ws://localhost:8000').replace('http', 'ws');
    wsRef.current = new WebSocket(`${wsURL}/api/alerts/ws/alerts`);

    wsRef.current.onopen = () => {
      console.log('✓ WebSocket connected to alerts');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_alert') {
          addAlert(data.alert);
          playAlertBeep(data.alert.severity);
        } else if (data.type === 'alert_resolved') {
          resolveAlert(data.alert_id);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [addAlert, resolveAlert]);

  return wsRef.current;
};

export const playAlertBeep = (severity) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Different frequencies for different severities
  const frequencies = {
    critical: 880,
    warning: 660,
    info: 440,
  };

  oscillator.frequency.value = frequencies[severity] || 440;
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

export const useAsync = (asyncFunction, immediate = true) => {
  const [status, setStatus] = React.useState('idle');
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);

  const execute = React.useCallback(async () => {
    setStatus('pending');
    setData(null);
    setError(null);
    try {
      const response = await asyncFunction();
      setData(response.data);
      setStatus('success');
      return response.data;
    } catch (error) {
      setError(error);
      setStatus('error');
    }
  }, [asyncFunction]);

  React.useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, data, error };
};
