export type UserRole = 'cpa' | 'client';

export type FilingStatus =
  | 'single'
  | 'married_joint'
  | 'married_separate'
  | 'head_of_household'
  | 'qualifying_widow';

export type DocumentType =
  | 'w2'
  | '1099_misc'
  | '1099_int'
  | '1099_div'
  | '1099_b'
  | '1099_nec'
  | 'schedule_c'
  | 'receipt'
  | 'bank_statement'
  | 'other';

export type DocumentStatus =
  | 'uploaded'
  | 'processing'
  | 'extracted'
  | 'reviewed'
  | 'complete';

export type ExtractionMethod = 'deterministic' | 'ocr' | 'ai' | 'manual';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface Database {
  public: {
    Tables: {
      cpa_firms: {
        Row: {
          id: string;
          firm_name: string;
          address: string | null;
          phone: string | null;
          tax_software_used: string | null;
          settings: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          firm_name: string;
          address?: string | null;
          phone?: string | null;
          tax_software_used?: string | null;
          settings?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          firm_name?: string;
          address?: string | null;
          phone?: string | null;
          tax_software_used?: string | null;
          settings?: Record<string, any> | null;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          cpa_firm_id: string | null;
          assigned_cpa_id: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          cpa_firm_id?: string | null;
          assigned_cpa_id?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          cpa_firm_id?: string | null;
          assigned_cpa_id?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      clients_profile: {
        Row: {
          id: string;
          user_id: string;
          ssn_encrypted: string | null;
          date_of_birth: string | null;
          address: string | null;
          filing_status: FilingStatus | null;
          spouse_name: string | null;
          spouse_ssn_encrypted: string | null;
          dependents: Array<any> | null;
          notes: string | null;
          tax_info: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ssn_encrypted?: string | null;
          date_of_birth?: string | null;
          address?: string | null;
          filing_status?: FilingStatus | null;
          spouse_name?: string | null;
          spouse_ssn_encrypted?: string | null;
          dependents?: Array<any> | null;
          notes?: string | null;
          tax_info?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ssn_encrypted?: string | null;
          date_of_birth?: string | null;
          address?: string | null;
          filing_status?: FilingStatus | null;
          spouse_name?: string | null;
          spouse_ssn_encrypted?: string | null;
          dependents?: Array<any> | null;
          notes?: string | null;
          tax_info?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          client_id: string;
          cpa_id: string;
          file_name: string;
          file_url: string;
          file_size: number;
          file_type: string;
          document_type: DocumentType | null;
          tax_year: number;
          status: DocumentStatus;
          uploaded_at: string;
          processed_at: string | null;
          reviewed_at: string | null;
          confidence_score: number | null;
          requires_review: boolean;
          notes: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          cpa_id: string;
          file_name: string;
          file_url: string;
          file_size: number;
          file_type: string;
          document_type?: DocumentType | null;
          tax_year: number;
          status?: DocumentStatus;
          uploaded_at?: string;
          processed_at?: string | null;
          reviewed_at?: string | null;
          confidence_score?: number | null;
          requires_review?: boolean;
          notes?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          cpa_id?: string;
          file_name?: string;
          file_url?: string;
          file_size?: number;
          file_type?: string;
          document_type?: DocumentType | null;
          tax_year?: number;
          status?: DocumentStatus;
          uploaded_at?: string;
          processed_at?: string | null;
          reviewed_at?: string | null;
          confidence_score?: number | null;
          requires_review?: boolean;
          notes?: string | null;
        };
      };
      extracted_data: {
        Row: {
          id: string;
          document_id: string;
          field_name: string;
          field_value: string | null;
          confidence_score: number | null;
          manually_verified: boolean;
          verified_by: string | null;
          verified_at: string | null;
          extraction_method: ExtractionMethod;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          field_name: string;
          field_value?: string | null;
          confidence_score?: number | null;
          manually_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          extraction_method: ExtractionMethod;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          field_name?: string;
          field_value?: string | null;
          confidence_score?: number | null;
          manually_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          extraction_method?: ExtractionMethod;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          client_id: string;
          cpa_id: string;
          title: string;
          description: string | null;
          priority: TaskPriority;
          status: TaskStatus;
          due_date: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          cpa_id: string;
          title: string;
          description?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          due_date?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          cpa_id?: string;
          title?: string;
          description?: string | null;
          priority?: TaskPriority;
          status?: TaskStatus;
          due_date?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          subject: string | null;
          body: string;
          read: boolean;
          related_document_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          subject?: string | null;
          body: string;
          read?: boolean;
          related_document_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          from_user_id?: string;
          to_user_id?: string;
          subject?: string | null;
          body?: string;
          read?: boolean;
          related_document_id?: string | null;
          created_at?: string;
        };
      };
      client_invitations: {
        Row: {
          id: string;
          cpa_id: string;
          firm_id: string;
          email: string;
          token: string;
          status: InvitationStatus;
          invited_at: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          client_name: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          cpa_id: string;
          firm_id: string;
          email: string;
          token?: string;
          status?: InvitationStatus;
          invited_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          client_name?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          cpa_id?: string;
          firm_id?: string;
          email?: string;
          token?: string;
          status?: InvitationStatus;
          invited_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          client_name?: string | null;
          notes?: string | null;
        };
      };
    };
  };
}

