import React, { useEffect, useState } from 'react';
import { ExperienceAnswer, User, UserRole } from '../../types';
import { LocationAutocomplete } from '../LocationAutocomplete';
import { IconFileText } from '../Icons';
import FormSelect from './FormSelect';
import { INPUT_CLASS, LABEL_CLASS } from './formStyles';
import { NATIONALITIES } from '../../src/constants/data.ts';
import { MAID_EXPERIENCE_QUESTIONS } from '../../src/constants/questions.ts';
import { db } from '../../services/db.ts';

const ProfilePage: React.FC<{ user: User; onUpdate: (u: User) => void }> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState<Partial<User>>({ ...user });
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user.avatar);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // 1. Show local preview immediately
      setAvatarPreview(URL.createObjectURL(file));

      try {
        setUploading(true);
        // 2. Upload to GCS
        const result = await db.uploadFile(file, user.id, 'avatars');

        // 3. Update form data with the new file ID and URL
        setFormData((prev) => ({
          ...prev,
          avatarFileId: result.id,
          avatar: result.url, // Use the GCS URL for immediate display
        }));
      } catch (err) {
        alert('Failed to upload image.');
      } finally {
        setUploading(false);
      }
    }
  };

  useEffect(() => {
    setFormData({ ...user });
    if (user.experienceAnswers) {
      const ans: { [key: string]: string } = {};
      user.experienceAnswers.forEach((a) => (ans[a.questionId] = a.answer));
      setAnswers(ans);
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Helper for Multi-Select (Checkboxes)
  const handleMultiToggle = (questionId: string, option: string) => {
    const currentRaw = answers[questionId] || '[]';
    let currentArray: string[] = [];
    try {
      currentArray = JSON.parse(currentRaw);
    } catch {
      currentArray = [];
    }

    const nextArray = currentArray.includes(option)
      ? currentArray.filter((i) => i !== option)
      : [...currentArray, option];

    setAnswers((prev) => ({ ...prev, [questionId]: JSON.stringify(nextArray) }));
  };

  const [cvUploading, setCvUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Optional: Validation
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert('File is too large. Max 5MB.');
        return;
      }

      try {
        setCvUploading(true);

        // 1. Upload the file to GCS in the 'cvs' folder
        const result = await db.uploadFile(file, user.id, 'cvs');

        // 2. Update local state with the GCS result
        setFormData((prev) => ({
          ...prev,
          cvFileId: result.id, // The UUID for user_files
          cvFileName: file.name, // The display name
        }));

        alert('CV uploaded and ready to save!');
      } catch (err) {
        console.error(err);
        alert('Failed to upload CV.');
      } finally {
        setCvUploading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newName = `${formData.firstName || ''} ${formData.surname || ''}`.trim() || formData.name;

    let updatedUser: User = { ...user, ...formData, name: newName || user.name };

    if (user.role === UserRole.MAID) {
      updatedUser.experienceAnswers = MAID_EXPERIENCE_QUESTIONS.map((q) => ({
        questionId: q.id,
        question: q.text,
        answer: answers[q.id] || '',
      }));
      if (cvFile) updatedUser.cvFileName = cvFile.name;
    }

    onUpdate(updatedUser);
    alert('Profile updated successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Avatar Upload Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          <img
            src={avatarPreview || 'https://via.placeholder.com/150'}
            className={`h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg ${uploading ? 'opacity-50' : ''}`}
            alt="Avatar"
          />
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
            <span className="text-white text-xs font-bold">Change Photo</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
          </label>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500 font-medium">Click image to upload new photo</p>
      </div>
      {/* This is where the end of the profile page ends here */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Settings</h3>
          {user.role === UserRole.MAID && (
            <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full font-bold">
              Maid Profile
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* PERSONAL INFO SECTION */}
          <div>
            <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-4">
              Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={LABEL_CLASS}>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName || ''}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Surname</label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname || ''}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth || ''}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <FormSelect
                  label="Nationality"
                  name="nationality"
                  value={formData.nationality || ''}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Nationality' },
                    ...NATIONALITIES.map((n) => ({ value: n, label: n })),
                  ]}
                />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>Residential Address</label>
                <LocationAutocomplete
                  name="address"
                  value={formData.address || ''}
                  onChange={(val) => setFormData((prev) => ({ ...prev, address: val }))}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL_CLASS}>Bio (Intro for Clients)</label>
                <textarea
                  rows={3}
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                  placeholder="Tell us about your experience..."
                />
              </div>
            </div>
          </div>

          {/* EXPERIENCE SECTION (MODIFIED FOR SMART INPUTS) */}
          {user.role === UserRole.MAID && (
            <>
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-4">
                  Work Preferences & Experience
                </h4>
                <div className="space-y-6">
                  {MAID_EXPERIENCE_QUESTIONS.map((q) => (
                    <div key={q.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <label className="block text-sm font-bold text-gray-700 mb-3">{q.text}</label>

                      {/* Render Radios */}
                      {q.type === 'radio' && (
                        <div className="flex flex-wrap gap-4">
                          {q.options?.map((opt) => (
                            <label key={opt} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name={q.id}
                                className="h-4 w-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                                checked={answers[q.id] === opt}
                                onChange={() => handleAnswerChange(q.id, opt)}
                              />
                              <span className="ml-2 text-sm text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Render Multi-Select (Checkboxes) */}
                      {q.type === 'multi' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {q.options?.map((opt) => {
                            let isChecked = false;
                            try {
                              isChecked = JSON.parse(answers[q.id] || '[]').includes(opt);
                            } catch {
                              isChecked = false;
                            }
                            return (
                              <label
                                key={opt}
                                className={`flex items-center p-2 rounded border transition-colors cursor-pointer ${isChecked ? 'bg-teal-50 border-teal-200' : 'bg-white border-gray-200'}`}
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                  checked={isChecked}
                                  onChange={() => handleMultiToggle(q.id, opt)}
                                />
                                <span className="ml-2 text-xs text-gray-700">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* DOCUMENTS SECTION */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-4">
                  Documents
                </h4>
                <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center">
                    <IconFileText
                      className={`h-8 w-8 mr-3 ${cvUploading ? 'text-gray-300 animate-pulse' : 'text-teal-500'}`}
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Professional CV (PDF)</p>
                      <p className="text-xs text-gray-500">
                        {cvUploading
                          ? 'Uploading to secure storage...'
                          : formData.cvFileName || 'No file uploaded'}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={cvUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      className={`px-3 py-2 border border-teal-600 text-teal-600 rounded-md text-xs font-bold hover:bg-teal-50 ${cvUploading ? 'opacity-50' : ''}`}
                    >
                      {formData.cvFileId ? 'Change CV' : 'Upload CV'}
                    </button>
                  </div>
                </div>
                {formData.cvFileId && !cvUploading && (
                  <p className="mt-2 text-[10px] text-green-600 font-medium">
                    ✓ Document linked. Click "Update Profile" to finalize.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="pt-5 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex justify-center py-2 px-10 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none"
            >
              Update Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
