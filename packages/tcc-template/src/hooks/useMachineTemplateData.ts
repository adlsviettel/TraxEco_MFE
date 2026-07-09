import { useState, useEffect } from 'react';
import { tccService, type TccMachineTemplate, type UpdateProgressPayload } from '../services/tccService';

const normalizeStr = (str: string) => str ? str.replace(/[\s-]/g, '').toLowerCase() : '';

export function useMachineTemplateData(
  open: boolean,
  factory: string | undefined,
  machineType: string | undefined,
  machineDimension: string | undefined,
  setEditForm: React.Dispatch<React.SetStateAction<UpdateProgressPayload>>
) {
  const [machineTemplates, setMachineTemplates] = useState<TccMachineTemplate[]>([]);
  const [availableMachineTypes, setAvailableMachineTypes] = useState<string[]>([]);
  const [availableMachineDimensions, setAvailableMachineDimensions] = useState<string[]>([]);
  
  const [seasons, setSeasons] = useState<string[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [sampleStages, setSampleStages] = useState<string[]>(['19 -Production', '19 -Develop', '19 -Photo', '19 -SMS', '19 -Other']);

  // Load machine templates and metadata
  useEffect(() => {
    if (open) {
      const loadTemplatesAndMetadata = async () => {
        try {
          const [templates, meta] = await Promise.all([
            tccService.getMachineTemplates(),
            tccService.getMetadata()
          ]);
          if (Array.isArray(templates)) {
            setMachineTemplates(templates);
          }
          if (meta.season) setSeasons(meta.season);
          if (meta.productType) setProductTypes(meta.productType);
          if (meta.sampleStage) {
            setSampleStages(prev => Array.from(new Set([...prev, ...meta.sampleStage])));
          }
        } catch (e) {
          console.error('Failed to load machine templates and metadata in hook', e);
        }
      };
      loadTemplatesAndMetadata();
    } else {
      setMachineTemplates([]);
      setAvailableMachineTypes([]);
      setAvailableMachineDimensions([]);
    }
  }, [open]);

  // Update available machine types based on factory
  useEffect(() => {
    if (factory && machineTemplates.length > 0) {
      const normalizedSelected = normalizeStr(factory);
      const types = Array.from(
        new Set(
          machineTemplates
            .filter(t => normalizeStr(t.factory) === normalizedSelected)
            .map(t => t.machineType)
        )
      );
      setAvailableMachineTypes(types);
      if (machineType && !types.includes(machineType)) {
        setEditForm(prev => ({ ...prev, machineType: '', machineDimension: '' }));
      }
    } else {
      setAvailableMachineTypes([]);
      setEditForm(prev => ({ ...prev, machineType: '', machineDimension: '' }));
    }
  }, [factory, machineTemplates, machineType, setEditForm]);

  // Update available machine dimensions based on factory and machineType
  useEffect(() => {
    if (machineType && factory && machineTemplates.length > 0) {
      const normalizedSelected = normalizeStr(factory);
      const dims = Array.from(
        new Set(
          machineTemplates
            .filter(
              t => normalizeStr(t.factory) === normalizedSelected && t.machineType === machineType
            )
            .map(t => t.machineDimension)
        )
      );
      setAvailableMachineDimensions(dims);
      if (machineDimension && !dims.includes(machineDimension)) {
        setEditForm(prev => ({ ...prev, machineDimension: '' }));
      }
    } else {
      setAvailableMachineDimensions([]);
      setEditForm(prev => ({ ...prev, machineDimension: '' }));
    }
  }, [machineType, factory, machineTemplates, machineDimension, setEditForm]);

  return {
    availableMachineTypes,
    availableMachineDimensions,
    seasons,
    productTypes,
    sampleStages
  };
}
