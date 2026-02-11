import React, { useEffect, useRef, useState } from 'react';
import { Job, JobStatus, PaymentType, User } from '../../types';
import { generateJobDescription } from '../../services/geminiService';
import { loadGoogleMaps } from '../../services/googleMaps';
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
  clientProfile?: User;
  users?: User[];
}> = ({ job, isOpen, onClose, onSave, clientId, clientProfile, users = [] }) => {
  // Use undefined for price and areaSize so the inputs can be empty
  const [formData, setFormData] = useState<Partial<Job>>({
    title: '',
    description: '',
    location: '',
    publicArea: '',
    fullAddress: '',
    placeId: undefined,
    latitude: null,
    longitude: null,
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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (job) {
      setFormData({
        ...job,
        publicArea: job.publicArea || job.location || '',
        fullAddress: job.fullAddress || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        location: '',
        publicArea: '',
        fullAddress: '',
        placeId: undefined,
        latitude: null,
        longitude: null,
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

  const derivePublicArea = (components: google.maps.GeocoderAddressComponent[] | undefined) => {
    if (!components) return '';
    const preferredTypes = [
      'sublocality_level_1',
      'sublocality',
      'locality',
      'administrative_area_level_2',
      'administrative_area_level_1',
    ];
    for (const type of preferredTypes) {
      const match = components.find((component) => component.types.includes(type));
      if (match?.long_name) return match.long_name;
    }
    return '';
  };

  const fetchPlaceDetails = async (placeId: string) => {
    try {
      const google = await loadGoogleMaps();
      if (!google.maps?.places) return null;
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      return await new Promise<google.maps.places.PlaceResult | null>((resolve) => {
        service.getDetails(
          {
            placeId,
            fields: ['geometry', 'address_components', 'formatted_address'],
          },
          (place, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
              resolve(null);
              return;
            }
            resolve(place);
          }
        );
      });
    } catch (error) {
      console.warn('Unable to load place details', error);
      return null;
    }
  };

  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.defaultPrevented || event.key !== 'Enter' || event.shiftKey) return;
    const target = event.target as HTMLElement | null;
    if (!target || target.tagName === 'TEXTAREA') return;
    const form = formRef.current;
    if (!form) return;

    event.preventDefault();
    const focusables = Array.from(
      form.querySelectorAll('input, select, textarea, button')
    ) as HTMLElement[];
    const enabled = focusables.filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
    const index = enabled.indexOf(target);
    if (index >= 0 && index < enabled.length - 1) {
      enabled[index + 1].focus();
    }
  };

  const handleGenerateDesc = async () => {
    if (!formData.publicArea || !formData.areaSize) {
      alert('Please fill in the public area and size first.');
      return;
    }
    setLoadingAI(true);
    const maidUsers = users.filter((u) => u.role === 'MAID');
    const ratedMaids = maidUsers.filter((u) => (u.ratingCount || 0) > 0);
    const averageRating =
      ratedMaids.length > 0
        ? (ratedMaids.reduce((sum, u) => sum + (u.rating || 0), 0) / ratedMaids.length).toFixed(2)
        : '0.00';
    const ratingSummary = `${ratedMaids.length} rated maids, average rating ${averageRating}/5`;

    const desc = await generateJobDescription(
      formData.rooms || 0,
      formData.bathrooms || 0,
      formData.areaSize || 0,
      formData.publicArea || '',
      formData.title || 'General Cleaning',
      {
        client: clientProfile,
        maidRatingSummary: ratingSummary,
      }
    );
    setFormData((prev) => ({ ...prev, description: desc }));
    setLoadingAI(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation to ensure required numbers are present
    if (!formData.fullAddress || !formData.publicArea) {
      alert('Please enter both the full address and the public area.');
      return;
    }

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
      location: formData.publicArea!,
      publicArea: formData.publicArea!,
      fullAddress: formData.fullAddress!,
      placeId: formData.placeId,
      latitude: formData.latitude ?? null,
      longitude: formData.longitude ?? null,
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
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            onKeyDown={handleFormKeyDown}
            className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4"
          >
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
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>Full Address (private)</label>
                <LocationAutocomplete
                  value={formData.fullAddress || ''}
                  onChange={(val) => setFormData({ ...formData, fullAddress: val })}
                  onPlaceSelect={async (place) => {
                    if (!place.placeId) return;
                    const details = await fetchPlaceDetails(place.placeId);
                    const nextPublicArea = derivePublicArea(details?.address_components);
                    setFormData((prev) => ({
                      ...prev,
                      fullAddress: place.description,
                      placeId: place.placeId ?? prev.placeId,
                      latitude: details?.geometry?.location?.lat?.() ?? prev.latitude ?? null,
                      longitude: details?.geometry?.location?.lng?.() ?? prev.longitude ?? null,
                      publicArea: prev.publicArea || nextPublicArea || '',
                    }));
                  }}
                  className={INPUT_CLASS}
                  placeholder="Street address, unit, complex, etc."
                  required
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Public Area (shown to maids)</label>
                <LocationAutocomplete
                  value={formData.publicArea || ''}
                  onChange={(val) => setFormData({ ...formData, publicArea: val })}
                  className={INPUT_CLASS}
                  placeholder="Suburb or area"
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
