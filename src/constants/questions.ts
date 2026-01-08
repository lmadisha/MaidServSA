export enum QuestionType {
  TEXT = 'text',
  RADIO = 'radio',
  SELECT = 'select',
  MULTI_SELECT = 'multi',
}

export const MAID_EXPERIENCE_QUESTIONS = [
  {
    id: 'exp_years',
    text: 'Years of professional cleaning experience?',
    type: QuestionType.RADIO,
    options: ['0-1 year', '1-3 years', '3-5 years', '5+ years'],
  },
  {
    id: 'specialties',
    text: 'Which specialized services can you provide?',
    type: QuestionType.MULTI_SELECT,
    options: ['Deep Cleaning', 'Ironing', 'Windows', 'Oven Cleaning', 'Laundry', 'Move-in/out'],
  },
  {
    id: 'supplies',
    text: 'Do you bring your own cleaning supplies?',
    type: QuestionType.RADIO,
    options: [
      'I bring everything',
      'Client must provide everything',
      'I bring basic chemicals only',
    ],
  },
  {
    id: 'pets',
    text: 'Are you comfortable working in homes with pets?',
    type: QuestionType.RADIO,
    options: ['Yes', 'No', 'Small pets only'],
  },
  {
    id: 'availability',
    text: 'Which days are you typically available?',
    type: QuestionType.MULTI_SELECT,
    options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
];
