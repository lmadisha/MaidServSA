import React, { useState } from 'react';
import { generateApplicationMessage } from '../../services/geminiService';
import { Job, User } from '../../types';
import { IconSparkles } from '../Icons';
import { INPUT_CLASS } from './formStyles';

const ApplyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  jobTitle: string;
  job?: Job | null;
  maid?: User;
}> = ({ isOpen, onClose, onSubmit, jobTitle, job, maid }) => {
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!job || !maid) return;
    setIsGenerating(true);
    const generated = await generateApplicationMessage(
      {
        title: job.title,
        description: job.description,
        publicArea: job.publicArea,
        location: job.location,
        rooms: job.rooms,
        bathrooms: job.bathrooms,
        areaSize: job.areaSize,
      },
      {
        name: maid.name,
        bio: maid.bio,
        experienceAnswers: maid.experienceAnswers,
        cvFileName: maid.cvFileName,
        rating: maid.rating,
        ratingCount: maid.ratingCount,
      }
    );
    setMessage(generated);
    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Apply for {jobTitle}</h3>
            <p className="text-sm text-gray-500 mb-4">
              Introduce yourself to the client. Mention your experience and why you are a good fit.
            </p>
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !job || !maid}
                className="text-xs text-teal-600 hover:text-teal-800 flex items-center disabled:opacity-60"
              >
                <IconSparkles className="w-3 h-3 mr-1" />
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
            <textarea
              className={INPUT_CLASS}
              rows={4}
              placeholder="Hi, I'd love to help with your cleaning. I have experience with..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
            />
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            <button
              onClick={() => {
                onSubmit(message);
                setMessage('');
              }}
              disabled={!message.trim()}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Application
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplyModal;
