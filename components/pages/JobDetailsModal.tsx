import React from 'react';
import { Job } from '../../types';
import { IconClock, IconMapPin, IconXCircle } from '../Icons';

const JobDetailsModal: React.FC<{
  job: Job | null;
  onClose: () => void;
  onApply?: (job: Job) => void;
  showApply?: boolean;
}> = ({ job, onClose, onApply, showApply = true }) => {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <IconXCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="font-semibold text-teal-600">
                    R{job.price}{' '}
                    <span className="text-xs text-gray-400 font-normal">
                      {job.paymentType === 'HOURLY' ? '/hr' : 'Total'}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Size</p>
                  <p className="font-semibold">{job.areaSize} m²</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Rooms</p>
                  <p className="font-semibold">
                    {job.rooms} Bed, {job.bathrooms} Bath
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-semibold">{job.duration || 8} Hours</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-600 border-b border-gray-100 pb-4">
                <div className="flex items-center">
                  <IconMapPin className="w-4 h-4 mr-2 text-gray-400" /> {job.location}
                </div>
                <div className="flex items-center">
                  <IconClock className="w-4 h-4 mr-2 text-gray-400" /> {job.startTime} -{' '}
                  {job.endTime}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>

              {job.workDates && job.workDates.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Scheduled Dates ({job.workDates.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {job.workDates.sort().map((d) => (
                      <span
                        key={d}
                        className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded border border-teal-100"
                      >
                        {new Date(d).toLocaleDateString()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {showApply && (
              <button
                type="button"
                onClick={() => onApply?.(job)}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Apply Now
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal;
