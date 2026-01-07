import React, { useEffect, useState } from 'react';
import { Job, JobStatus, PaymentType } from '../../types';
import { generateJobDescription } from '../../services/geminiService';
import { LocationAutocomplete } from '../LocationAutocomplete';
import { IconSparkles } from '../Icons';
import FullCalendarSelector from './FullCalendarSelector';
import { INPUT_CLASS, LABEL_CLASS } from './formStyles';

const JobModal: React.FC<{
  job?: Job;
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: Job) => void;
  clientId: string;
}> = ({ job, isOpen, onClose, onSave, clientId }) => {
  // Use undefined for price and areaSize so the inputs can be empty
  const [formData, setFormData] = useState<Partial<Job>>({
    title: '',
    description: '',
    location: '',
    areaSize: undefined,
    price: undefined,
    rooms: 1,
    bathrooms: 1,
    paymentType: PaymentType.FIXED,
    startTime: '08:00',
    endTime: '12:00',
    workDates: [],
    currency: 'R',
  });
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (job) {
      setFormData(job);
    } else {
      setFormData({
        title: '',
        description: '',
        location: '',
        areaSize: undefined,
        price: undefined,
        rooms: 1,
        bathrooms: 1,
        paymentType: PaymentType.FIXED,
        startTime: '08:00',
        endTime: '12:00',
        workDates: [],
        currency: 'R',
      });
    }
  }, [job, isOpen]);

  const handleGenerateDesc = async () => {
    if (!formData.location || !formData.areaSize) {
      alert('Please fill in location and size first.');
      return;
    }
    setLoadingAI(true);
    const desc = await generateJobDescription(
      formData.rooms || 0,
      formData.bathrooms || 0,
      formData.areaSize || 0,
      formData.location || '',
      formData.title || 'General Cleaning'
    );
    setFormData((prev) => ({ ...prev, description: desc }));
    setLoadingAI(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation to ensure required numbers are present
    if (formData.price === undefined || formData.areaSize === undefined) {
      alert('Please enter a price and area size.');
      return;
    }

    const duration =
      parseInt(formData.endTime!.split(':')[0]) - parseInt(formData.startTime!.split(':')[0]);

    const newJob: Job = {
      id: job?.id || crypto.randomUUID(), // Use crypto for cleaner IDs
      clientId,
      title: formData.title!,
      description: formData.description!,
      location: formData.location!,
      areaSize: formData.areaSize!,
      price: formData.price!,
      currency: formData.currency!,
      date: formData.workDates?.[0] || new Date().toISOString().split('T')[0],
      status: job?.status || JobStatus.OPEN,
      rooms: formData.rooms!,
      bathrooms: formData.bathrooms!,
      images: job?.images || [],
      paymentType: formData.paymentType!,
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      duration: duration > 0 ? duration : 4,
      workDates: formData.workDates || [],
      history: job?.history || [],
    };
    onSave(newJob);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {job ? 'Edit Job' : 'Post New Job'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>Job Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={INPUT_CLASS}
                  placeholder="e.g., Weekly Home Cleaning"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Location</label>
                <LocationAutocomplete
                  value={formData.location || ''}
                  onChange={(val) => setFormData({ ...formData, location: val })}
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Payment Type</label>
                <select
                  value={formData.paymentType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentType: e.target.value as PaymentType,
                    })
                  }
                  className={INPUT_CLASS}
                >
                  <option value={PaymentType.FIXED}>Fixed Price</option>
                  <option value={PaymentType.HOURLY}>Hourly Rate</option>
                </select>
              </div>

              {/* PRICE INPUT */}
              <div>
                <label className={LABEL_CLASS}>Price (R)</label>
                <input
                  type="number"
                  required
                  value={formData.price ?? ''} // Show empty string if undefined
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className={INPUT_CLASS}
                  placeholder="Enter price"
                />
              </div>

              {/* AREA SIZE INPUT */}
              <div>
                <label className={LABEL_CLASS}>Size (sqm)</label>
                <input
                  type="number"
                  required
                  value={formData.areaSize ?? ''} // Show empty string if undefined
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      areaSize: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className={INPUT_CLASS}
                  placeholder="m²"
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>Bedrooms</label>
                <input
                  type="number"
                  required
                  value={formData.rooms}
                  onChange={(e) => setFormData({ ...formData, rooms: Number(e.target.value) })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Bathrooms</label>
                <input
                  type="number"
                  required
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                  className={INPUT_CLASS}
                />
              </div>
              {/* Rest of the form stays the same... */}
              <div>
                <label className={LABEL_CLASS}>Start Time</label>
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>End Time</label>
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="md:col-span-2">
                <FullCalendarSelector
                  selectedDates={formData.workDates || []}
                  onChange={(dates) => setFormData({ ...formData, workDates: dates })}
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className={LABEL_CLASS}>Description</label>
                  <button
                    type="button"
                    onClick={handleGenerateDesc}
                    disabled={loadingAI}
                    className="text-xs text-teal-600 hover:text-teal-800 flex items-center"
                  >
                    <IconSparkles className="w-3 h-3 mr-1" />{' '}
                    {loadingAI ? 'Generating...' : 'Auto-Generate'}
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
              >
                Save Job
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JobModal;
