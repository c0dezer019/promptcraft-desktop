import React from 'react';
import { Sliders } from 'lucide-react';
import { Select, Input } from '../../atoms';
import { SectionHeader } from '../../molecules';
import { A1111_SAMPLERS } from '../../../constants/samplers';

/**
 * A1111Params Component - Parameters section for Automatic1111
 * @param {object} params - Parameters object
 * @param {function} updateParam - Update parameter handler
 */
export const A1111Params = ({ params, updateParam }) => {
  return (
    <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-800/50">
      <SectionHeader icon={Sliders} title="Generation Parameters" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-[10px] font-bold text-gray-500 mb-1">Sampling Method</label>
          <Select
            value={params.sampler}
            onChange={(e) => updateParam('sampler', e.target.value)}
            options={A1111_SAMPLERS}
            className="text-xs p-3 sm:p-2 focus:ring-orange-500"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-gray-500 mb-1">Steps</label>
          <Input
            type="number"
            value={params.steps}
            onChange={(e) => updateParam('steps', parseInt(e.target.value) || 20)}
            className="text-xs p-3 sm:p-2 focus:ring-orange-500"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-gray-500 mb-1">CFG Scale</label>
          <Input
            type="number"
            step="0.5"
            value={params.cfg}
            onChange={(e) => updateParam('cfg', parseFloat(e.target.value) || 7)}
            className="text-xs p-3 sm:p-2 focus:ring-orange-500"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-gray-500 mb-1">Width</label>
          <Input
            type="number"
            step="8"
            value={params.width}
            onChange={(e) => updateParam('width', parseInt(e.target.value) || 512)}
            className="text-xs p-3 sm:p-2 focus:ring-orange-500"
          />
        </div>
        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-gray-500 mb-1">Height</label>
          <Input
            type="number"
            step="8"
            value={params.height}
            onChange={(e) => updateParam('height', parseInt(e.target.value) || 512)}
            className="text-xs p-3 sm:p-2 focus:ring-orange-500"
          />
        </div>
      </div>
    </div>
  );
};
