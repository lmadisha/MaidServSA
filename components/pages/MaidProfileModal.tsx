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

  const handleViewCV = async () => {
    if (!user.cvFileId) return;
    try {
      const url = await db.getSignedUrl(user.cvFileId);
      window.open(url, '_blank'); // Opens the private CV in a new tab safely
    } catch (err) {
      alert('Could not retrieve CV. Please try again.');
    }
  };

  // HELPER: Formats raw database strings into readable text or tags
  const renderFormattedAnswer = (rawAnswer: string) => {
    if (!rawAnswer) return <span className="text-gray-400 italic">No answer provided</span>;

    try {
      // Check if the answer is a JSON array (from our Multi-Selectors)
      const parsed = JSON.parse(rawAnswer);

      if (Array.isArray(parsed)) {
        return (
          <div className="flex flex-wrap gap-1 mt-1">
            {parsed.map((item, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[11px] font-semibold rounded-md border border-teal-100"
              >
                {item}
              </span>
            ))}
          </div>
        );
      }
    } catch (e) {
      // If it's not JSON (Radio/Text), just return the plain string
    }

    return <p className="text-sm text-gray-700 font-medium">{rawAnswer}</p>;
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4 text-center">
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <img
                  src={user.avatar}
                  className="h-14 w-14 rounded-full mr-4 border-2 border-teal-500 shadow-sm"
                  alt=""
                />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500 font-medium">
                    {user.location || 'Location hidden'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <IconXCircle className="w-7 h-7 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Bio Section */}
              <div>
                <h4 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-2">
                  Maid Bio
                </h4>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {user.bio || "This maid hasn't written a bio yet."}
                  </p>
                </div>
              </div>

              {/* Experience Questionnaire (The part we fixed) */}
              <div>
                <h4 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">
                  Experience Details
                </h4>
                {loading ? (
                  <div className="animate-pulse flex space-y-4 flex-col">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : answers.length > 0 ? (
                  <div className="space-y-4">
                    {answers.map((a, i) => (
                      <div key={i} className="group">
                        <p className="text-xs font-bold text-gray-400 group-hover:text-teal-500 transition-colors">
                          {a.question}
                        </p>
                        <div className="mt-1">{renderFormattedAnswer(a.answer)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No experience data available.</p>
                )}
              </div>

              {/* CV Section */}
              <div>
                <h4 className="text-xs font-bold text-teal-600 uppercase mb-3">Documents</h4>
                {user.cvFileId ? (
                  <button
                    onClick={handleViewCV}
                    className="flex items-center justify-between w-full px-4 py-3 bg-white border-2 border-teal-100 rounded-xl hover:border-teal-600 hover:bg-teal-50 transition-all group"
                  >
                    <div className="flex items-center">
                      <IconFile className="w-5 h-5 mr-3 text-teal-600" />
                      <span className="text-sm font-bold text-gray-700">View Professional CV</span>
                    </div>
                    <span className="text-xs font-bold text-teal-600">Secure Access ›</span>
                  </button>
                ) : (
                  <p className="text-xs text-gray-400 italic">No CV uploaded.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaidProfileModal;
