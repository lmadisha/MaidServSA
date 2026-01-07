// components/pages/MaidProfileModal.tsx
import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { db } from '../../services/db';
import { IconXCircle, IconFile } from '../Icons';

const MaidProfileModal: React.FC<{
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ user, isOpen, onClose }) => {
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setLoading(true);
      db.getExperienceAnswers(user.id)
        .then(setAnswers)
        .finally(() => setLoading(false));
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <img
                  src={user.avatar}
                  className="h-12 w-12 rounded-full mr-4 border-2 border-teal-500"
                  alt=""
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">
                    {user.location || 'Location not specified'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <IconXCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Bio Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
                  About
                </h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg italic">
                  {user.bio || 'No bio provided.'}
                </p>
              </div>

              {/* Experience Questionnaire */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
                  Experience Details
                </h4>
                {loading ? (
                  <p className="text-xs text-gray-400">Loading answers...</p>
                ) : answers.length > 0 ? (
                  <div className="space-y-3">
                    {answers.map((a, i) => (
                      <div key={i} className="border-l-2 border-teal-200 pl-3">
                        <p className="text-xs font-bold text-gray-700">{a.question}</p>
                        <p className="text-sm text-gray-600">{a.answer || 'No answer'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No experience answers provided.</p>
                )}
              </div>

              {/* CV Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
                  Documents
                </h4>
                {user.cvFileName ? (
                  <a
                    href={`/api/uploads/${user.cvFileName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-teal-600 text-teal-600 rounded-md hover:bg-teal-50 transition-colors"
                  >
                    <IconFile className="w-4 h-4 mr-2" />
                    View CV (PDF)
                  </a>
                ) : (
                  <p className="text-xs text-gray-400 italic">No CV uploaded.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
            <button
              onClick={onClose}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Close Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaidProfileModal;
