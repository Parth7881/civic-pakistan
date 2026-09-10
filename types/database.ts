export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          role: 'citizen' | 'government_user' | 'platform_admin'
          active_jurisdiction_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          role?: 'citizen' | 'government_user' | 'platform_admin'
          active_jurisdiction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          role?: 'citizen' | 'government_user' | 'platform_admin'
          active_jurisdiction_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      jurisdictions: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          level_label: string | null
          boundary: unknown // PostGIS geography
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          level_label?: string | null
          boundary: unknown
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          level_label?: string | null
          boundary?: unknown
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      government_memberships: {
        Row: {
          id: string
          user_id: string
          jurisdiction_id: string
          role_in_jurisdiction: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          jurisdiction_id: string
          role_in_jurisdiction: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          jurisdiction_id?: string
          role_in_jurisdiction?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      capture_sessions: {
        Row: {
          id: string
          citizen_id: string
          coordinates: unknown // PostGIS point
          accuracy_meters: number
          jurisdiction_id: string
          started_at: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          citizen_id: string
          coordinates: unknown
          accuracy_meters: number
          jurisdiction_id: string
          started_at?: string
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          citizen_id?: string
          coordinates?: unknown
          accuracy_meters?: number
          jurisdiction_id?: string
          started_at?: string
          expires_at?: string
          created_at?: string
        }
      }
      citizen_reports: {
        Row: {
          id: string
          citizen_id: string
          capture_session_id: string
          jurisdiction_id: string
          urgency: 'URGENT_HAZARD' | 'MAINTENANCE'
          description: string | null
          coordinates: unknown // PostGIS point
          accuracy_meters: number
          submitted_at: string
          status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'ASSOCIATED_DUPLICATE'
          requires_manual_classification: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          citizen_id: string
          capture_session_id: string
          jurisdiction_id: string
          urgency: 'URGENT_HAZARD' | 'MAINTENANCE'
          description?: string | null
          coordinates: unknown
          accuracy_meters: number
          submitted_at?: string
          status?: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'ASSOCIATED_DUPLICATE'
          requires_manual_classification?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          citizen_id?: string
          capture_session_id?: string
          jurisdiction_id?: string
          urgency?: 'URGENT_HAZARD' | 'MAINTENANCE'
          description?: string | null
          coordinates?: unknown
          accuracy_meters?: number
          submitted_at?: string
          status?: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'ASSOCIATED_DUPLICATE'
          requires_manual_classification?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      incidents: {
        Row: {
          id: string
          jurisdiction_id: string
          primary_report_id: string
          category: string | null
          urgency: 'URGENT_HAZARD' | 'MAINTENANCE' | null
          workstream: string | null
          status: 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED_RESOLVED' | 'FLAGGED_FOR_REREVIEW'
          coordinates: unknown // PostGIS point
          created_at: string
          accepted_at: string | null
          sla_deadline: string | null
          resolved_at: string | null
          is_public: boolean
        }
        Insert: {
          id?: string
          jurisdiction_id: string
          primary_report_id: string
          category?: string | null
          urgency?: 'URGENT_HAZARD' | 'MAINTENANCE' | null
          workstream?: string | null
          status?: 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED_RESOLVED' | 'FLAGGED_FOR_REREVIEW'
          coordinates: unknown
          created_at?: string
          accepted_at?: string | null
          sla_deadline?: string | null
          resolved_at?: string | null
          is_public?: boolean
        }
        Update: {
          id?: string
          jurisdiction_id?: string
          primary_report_id?: string
          category?: string | null
          urgency?: 'URGENT_HAZARD' | 'MAINTENANCE' | null
          workstream?: string | null
          status?: 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED_RESOLVED' | 'FLAGGED_FOR_REREVIEW'
          coordinates?: unknown
          created_at?: string
          accepted_at?: string | null
          sla_deadline?: string | null
          resolved_at?: string | null
          is_public?: boolean
        }
      }
      evidence: {
        Row: {
          id: string
          report_id: string | null
          incident_id: string | null
          uploader_id: string
          coordinates: unknown | null
          captured_at: string
          storage_path_private: string
          storage_path_public: string
          media_hash: string | null
          is_resolution_evidence: boolean
          created_at: string
        }
        Insert: {
          id?: string
          report_id?: string | null
          incident_id?: string | null
          uploader_id: string
          coordinates?: unknown | null
          captured_at?: string
          storage_path_private: string
          storage_path_public: string
          media_hash?: string | null
          is_resolution_evidence?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string | null
          incident_id?: string | null
          uploader_id?: string
          coordinates?: unknown | null
          captured_at?: string
          storage_path_private?: string
          storage_path_public?: string
          media_hash?: string | null
          is_resolution_evidence?: boolean
          created_at?: string
        }
      }
    }
  }
}