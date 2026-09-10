export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Views: { [_ in never]: never }
    Functions: {
      start_capture: { Args: { p_citizen: string; p_lat: number; p_lng: number; p_accuracy: number; p_timestamp: string }; Returns: string }
      submit_citizen_report: { Args: { p_citizen: string; p_session: string; p_urgency: string; p_description: string; p_lat: number; p_lng: number; p_accuracy: number; p_timestamp: string; p_evidence: Json }; Returns: string }
      list_public_incidents: { Args: Record<string, never>; Returns: { id: string; jurisdiction_id: string; category: string | null; urgency: string | null; status: string; created_at: string; latitude: number; longitude: number }[] }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
    Tables: {
      capture_uploads: {
        Relationships: []
        Row: { id:string; capture_session_id:string; citizen_id:string; storage_path_private:string; storage_path_public:string; captured_at:string; media_hash:string; created_at:string }
        Insert: { id:string; capture_session_id:string; citizen_id:string; storage_path_private:string; storage_path_public:string; captured_at:string; media_hash:string; created_at?:string }
        Update: { id?:string }
      }
      profiles: {
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
        Row: {
          location_timestamp: string
          consumed_at: string | null
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
          location_timestamp: string
          consumed_at?: string | null
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
          location_timestamp?: string
          consumed_at?: string | null
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
        Relationships: []
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
        Relationships: []
        Row: {
          id: string
          jurisdiction_id: string
          primary_report_id: string
          category: string | null
          urgency: 'URGENT_HAZARD' | 'MAINTENANCE' | null
          workstream: string | null
          status: 'SUBMITTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED_RESOLVED' | 'FLAGGED_FOR_REREVIEW'
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
          status?: 'SUBMITTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED_RESOLVED' | 'FLAGGED_FOR_REREVIEW'
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
          status?: 'SUBMITTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED_RESOLVED' | 'FLAGGED_FOR_REREVIEW'
          coordinates?: unknown
          created_at?: string
          accepted_at?: string | null
          sla_deadline?: string | null
          resolved_at?: string | null
          is_public?: boolean
        }
      }
      evidence: {
        Relationships: []
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
