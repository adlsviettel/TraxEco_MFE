import { useState, useCallback, useEffect } from 'react';
import { qcAccessoryApi } from '../services/qcAccessoryApi';
import type { AQLLevel } from '../types';

export function useAQL(customer?: string) {
  const [aqlData, setAqlData] = useState<AQLLevel[]>([]);
  const [aqlLevels, setAqlLevels] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [currentAQL, setCurrentAQL] = useState<AQLLevel[]>([]);
  const [loading, setLoading] = useState(false);

  // Load AQL data on mount or customer change
  useEffect(() => {
    const loadAQL = async () => {
      setLoading(true);
      try {
        const data = await qcAccessoryApi.getAQLLevels(customer);
        if (Array.isArray(data)) {
          setAqlData(data);
          const levels = [...new Set(data.map((d: AQLLevel) => d.LevelNo))];
          setAqlLevels(levels);
          if (levels.length > 0) {
            setSelectedLevel(levels[0]);
            setCurrentAQL(data.filter((d: AQLLevel) => d.LevelNo === levels[0]));
          }
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };
    loadAQL();
  }, [customer]);

  // Change AQL level
  const changeLevel = useCallback((level: string) => {
    setSelectedLevel(level);
    setCurrentAQL(aqlData.filter(d => d.LevelNo === level));
  }, [aqlData]);

  // Calculate AQL for a given order qty
  const calculate = useCallback((orderQty: number): { sampleSize: number; accept: number; reject: number } | null => {
    for (const row of currentAQL) {
      const size1 = row.LoadSize1;
      const size2 = row.LoadSize2 || row.LoadSize1;
      if (orderQty >= size1 && orderQty <= size2) {
        return {
          sampleSize: row.SampleSize,
          accept: row.Accept,
          reject: row.Reject,
        };
      }
    }
    return null;
  }, [currentAQL]);

  return {
    aqlData, aqlLevels, selectedLevel, currentAQL, loading,
    changeLevel, calculate,
  };
}
