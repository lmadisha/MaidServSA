import React, { useEffect, useState } from 'react';
import { ExperienceAnswer, User, UserRole } from '../../types';
import { LocationAutocomplete } from '../LocationAutocomplete';
import { IconFileText } from '../Icons';
import FormSelect from './FormSelect';
import { INPUT_CLASS, LABEL_CLASS } from './formStyles';

const MAID_EXPERIENCE_QUESTIONS = [
  { id: 'q1', text: 'How many years of professional cleaning experience do you have?' },
  { id: 'q2', text: 'Are you comfortable working in homes with pets?' },
  {
    id: 'q3',
    text: 'Do you have experience with deep cleaning or specialized surfaces (e.g., marble, hardwood)?',
  },
  { id: 'q4', text: 'Are you available for weekend shifts?' },
];

const NATIONALITIES = [
  'Afghan',
  'Albanian',
  'Algerian',
  'American',
  'Andorran',
  'Angolan',
  'Antiguans',
  'Argentinean',
  'Armenian',
  'Australian',
  'Austrian',
  'Azerbaijani',
  'Bahamian',
  'Bahraini',
  'Bangladeshi',
  'Barbadian',
  'Barbudans',
  'Batswana',
  'Belarusian',
  'Belgian',
  'Belizean',
  'Beninese',
  'Bhutanese',
  'Bolivian',
  'Bosnian',
  'Brazilian',
  'British',
  'Bruneian',
  'Bulgarian',
  'Burkinabe',
  'Burmese',
  'Burundian',
  'Cambodian',
  'Cameroonian',
  'Canadian',
  'Cape Verdean',
  'Central African',
  'Chadian',
  'Chilean',
  'Chinese',
  'Colombian',
  'Comoran',
  'Congolese',
  'Costa Rican',
  'Croatian',
  'Cuban',
  'Cypriot',
  'Czech',
  'Danish',
  'Djibouti',
  'Dominican',
  'Dutch',
  'East Timorese',
  'Ecuadorian',
  'Egyptian',
  'Emirati',
  'Equatorial Guinean',
  'Eritrean',
  'Estonian',
  'Ethiopian',
  'Fijian',
  'Filipino',
  'Finnish',
  'French',
  'Gabonese',
  'Gambian',
  'Georgian',
  'German',
  'Ghanaian',
  'Greek',
  'Grenadian',
  'Guatemalan',
  'Guinea-Bissauan',
  'Guinean',
  'Guyanese',
  'Haitian',
  'Herzegovinian',
  'Honduran',
  'Hungarian',
  'I-Kiribati',
  'Icelander',
  'Indian',
  'Indonesian',
  'Iranian',
  'Iraqi',
  'Irish',
  'Israeli',
  'Italian',
  'Ivorian',
  'Jamaican',
  'Japanese',
  'Jordanian',
  'Kazakhstani',
  'Kenyan',
  'Kittian and Nevisian',
  'Kuwaiti',
  'Kyrgyz',
  'Laotian',
  'Latvian',
  'Lebanese',
  'Liberian',
  'Libyan',
  'Liechtensteiner',
  'Lithuanian',
  'Luxembourger',
  'Macedonian',
  'Malagasy',
  'Malawian',
  'Malaysian',
  'Maldivian',
  'Malian',
  'Maltese',
  'Marshallese',
  'Mauritanian',
  'Mauritian',
  'Mexican',
  'Micronesian',
  'Moldovan',
  'Monacan',
  'Mongolian',
  'Moroccan',
  'Mosotho',
  'Motswana',
  'Mozambican',
  'Namibian',
  'Nauruan',
  'Nepalese',
  'New Zealander',
  'Ni-Vanuatu',
  'Nicaraguan',
  'Nigerian',
  'Nigerien',
  'North Korean',
  'Northern Irish',
  'Norwegian',
  'Omani',
  'Pakistani',
  'Palauan',
  'Panamanian',
  'Papua New Guinean',
  'Paraguayan',
  'Peruvian',
  'Polish',
  'Portuguese',
  'Qatari',
  'Romanian',
  'Russian',
  'Rwandan',
  'Saint Lucian',
  'Salvadoran',
  'Samoan',
  'San Marinese',
  'Sao Tomean',
  'Saudi',
  'Scottish',
  'Senegalese',
  'Serbian',
  'Seychellois',
  'Sierra Leonean',
  'Singaporean',
  'Slovakian',
  'Slovenian',
  'Solomon Islander',
  'Somali',
  'South African',
  'South Korean',
  'Spanish',
  'Sri Lankan',
  'Sudanese',
  'Surinamer',
  'Swazi',
  'Swedish',
  'Swiss',
  'Syrian',
  'Taiwanese',
  'Tajik',
  'Tanzanian',
  'Thai',
  'Togolese',
  'Tongan',
  'Trinidadian or Tobagonian',
  'Tunisian',
  'Turkish',
  'Tuvaluan',
  'Ugandan',
  'Ukrainian',
  'Uruguayan',
  'Uzbekistani',
  'Venezuelan',
  'Vietnamese',
  'Welsh',
  'Yemenite',
  'Zambian',
  'Zimbabwean',
];

const RESIDENCY_STATUSES = [
  'Citizen (Born)',
  'Citizen (Naturalized)',
  'Permanent Resident',
  'Work Visa',
  'Study Visa',
  'Spousal Visa',
  'Refugee Status',
  'Other',
];

const ProfilePage: React.FC<{ user: User; onUpdate: (u: User) => void }> = ({ user, onUpdate }) => {
  const [formData, setFormData] = useState<Partial<User>>({ ...user });
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [cvFile, setCvFile] = useState<File | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newName = `${formData.firstName || ''} ${formData.surname || ''}`.trim() || formData.name;

    let updatedUser: User = {
      ...user,
      ...formData,
      name: newName || user.name,
    };

    if (user.role === UserRole.MAID) {
      const expAnswers: ExperienceAnswer[] = MAID_EXPERIENCE_QUESTIONS.map((q) => ({
        questionId: q.id,
        question: q.text,
        answer: answers[q.id] || '',
      }));
      updatedUser.experienceAnswers = expAnswers;

      if (cvFile) {
        updatedUser.cvFileName = cvFile.name;
      }
    }

    onUpdate(updatedUser);
    alert('Profile updated successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Settings</h3>
          {user.role === UserRole.MAID && (
            <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full">
              Service Provider Account
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div>
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
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
                <label className={LABEL_CLASS}>Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName || ''}
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
                <label className={LABEL_CLASS}>Place of Birth</label>
                <LocationAutocomplete
                  name="placeOfBirth"
                  value={formData.placeOfBirth || ''}
                  onChange={(val) => setFormData((prev) => ({ ...prev, placeOfBirth: val }))}
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
                    ...NATIONALITIES.map((nat) => ({ value: nat, label: nat })),
                  ]}
                />
              </div>
              <div className="md:col-span-2">
                <FormSelect
                  label="Residency / Visa Status"
                  name="residencyStatus"
                  value={formData.residencyStatus || ''}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Select Status' },
                    ...RESIDENCY_STATUSES.map((s) => ({ value: s, label: s })),
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
                <label className={LABEL_CLASS}>Bio</label>
                <textarea
                  rows={3}
                  name="bio"
                  value={formData.bio || ''}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                  placeholder="Tell us a bit about yourself..."
                />
              </div>
            </div>
          </div>

          {user.role === UserRole.MAID && (
            <>
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Experience & Qualifications
                </h4>
                <div className="space-y-4">
                  {MAID_EXPERIENCE_QUESTIONS.map((q) => (
                    <div key={q.id}>
                      <label className={`${LABEL_CLASS} mb-1`}>{q.text}</label>
                      <input
                        type="text"
                        className={INPUT_CLASS}
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                  Documents
                </h4>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <IconFileText className="h-8 w-8 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Curriculum Vitae (CV)</p>
                      {formData.cvFileName ? (
                        <p className="text-xs text-teal-600">Current: {formData.cvFileName}</p>
                      ) : (
                        <p className="text-xs text-gray-500">No file uploaded</p>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      {cvFile ? 'Change File' : 'Upload CV'}
                    </button>
                  </div>
                </div>
                {cvFile && <p className="mt-2 text-xs text-green-600">Selected: {cvFile.name}</p>}
              </div>
            </>
          )}

          <div className="pt-5 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
