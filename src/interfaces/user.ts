export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  documentNumber: string;
  documentType: string;
  gender: string;
  phone: string;
  dateOfBirth: string;
  country: string;
  state: string;
  city: string;
  avatarUrl: string;
  password: string;
  hasPassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organizer {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  user: User;
}
