import React, { useState } from 'react';

const INPUT_CLASS =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm px-4 py-2.5 bg-white text-gray-900 placeholder-gray-400 transition-colors duration-200 border';

const ApplyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  jobTitle: string;
}> = ({ isOpen, onClose, onSubmit, jobTitle }) => {
  const [message, setMessage] = useState('');

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
