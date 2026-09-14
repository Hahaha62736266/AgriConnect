export type ProgramStatus = 'open' | 'closed';

export type ApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface GovernmentProgram {
  id: string;
  title: string;
  description: string;
  agency: string;
  imageUrl?: string;
  municipality?: string;
  province?: string;
  region?: string;
  eligibilityCriteria: string[];
  requiredDocuments: string[];
  deadline: string;
  status: ProgramStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramApplication {
  id: string;
  programId: string;
  farmerId: string;
  farmerName: string;
  farmerPhone?: string;
  farmerRegion?: string;
  farmerProvince?: string;
  farmerMunicipality?: string;
  farmSizeHectares: number;
  cropsGrown: string[];
  rsbsaNumber?: string;
  submittedDocs: string[];
  status: ApplicationStatus;
  remarks?: string;
  reviewedBy?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  programTitle?: string;
}

export interface CreateProgramPayload {
  title: string;
  description: string;
  agency: string;
  imageUrl?: string;
  municipality?: string;
  province?: string;
  region?: string;
  eligibilityCriteria: string[];
  requiredDocuments: string[];
  deadline: string;
}

export interface SubmitApplicationPayload {
  rsbsaNumber?: string;
  farmSizeHectares: number;
  cropsGrown: string[];
  submittedDocs: string[];
}

export interface ReviewApplicationPayload {
  status: ApplicationStatus;
  remarks: string;
}
