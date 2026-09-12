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
      start_demo_capture: { Args: {p_citizen:string}; Returns:string }
      demo_capture_location: { Args: {p_citizen:string;p_session:string}; Returns:{latitude:number;longitude:number}[] }
      start_capture: { Args: { p_citizen: string; p_lat: number; p_lng: number; p_accuracy: number; p_timestamp: string }; Returns: string }
      submit_citizen_report: { Args: { p_citizen: string; p_session: string; p_urgency: string; p_description: string; p_lat: number; p_lng: number; p_accuracy: number; p_timestamp: string; p_evidence: Json }; Returns: string }
      list_public_incidents: { Args: Record<string, never>; Returns: { id: string; jurisdiction_id: string; category: string | null; urgency: string | null; status: string; created_at: string; latitude: number; longitude: number }[] }
      government_review_incident: { Args: {p_actor:string;p_incident:string;p_action:string;p_reason:string|null;p_category:string|null;p_urgency:string|null;p_workstream:string|null}; Returns:void }
      government_add_update: { Args: {p_actor:string;p_incident:string;p_body:string}; Returns:void }
      government_resolve_incident: { Args: {p_actor:string;p_incident:string;p_notes:string;p_upload_ids:string[]}; Returns:void }
      government_incident_location: { Args: {p_actor:string;p_incident:string}; Returns:{latitude:number;longitude:number}[] }
      government_incident_locations: { Args: {p_actor:string;p_incidents:string[]}; Returns:{incident_id:string;latitude:number;longitude:number}[] }
      government_jurisdiction_geometry: { Args: {p_actor:string}; Returns:{id:string;name:string;centroid_latitude:number;centroid_longitude:number;min_latitude:number;min_longitude:number;max_latitude:number;max_longitude:number}[] }
      jurisdiction_map_frames: { Args: Record<string, never>; Returns:{id:string;name:string;level_label:string;centroid_latitude:number;centroid_longitude:number;min_latitude:number;min_longitude:number;max_latitude:number;max_longitude:number}[] }
      admin_provision_government_user: { Args: {p_actor:string;p_user:string;p_name:string;p_jurisdiction:string;p_membership_role:'reviewer'|'operator'}; Returns:string }
      admin_update_government_membership: { Args: {p_actor:string;p_membership:string;p_jurisdiction:string;p_membership_role:'reviewer'|'operator'}; Returns:void }
      admin_set_government_access: { Args: {p_actor:string;p_user:string;p_enabled:boolean}; Returns:void }
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
          avatar_url: string | null
          leaderboard_visible: boolean
        }
        Insert: {
          id: string
          display_name?: string | null
          role?: 'citizen' | 'government_user' | 'platform_admin'
          active_jurisdiction_id?: string | null
          created_at?: string
          updated_at?: string
          avatar_url?: string | null
          leaderboard_visible?: boolean
        }
        Update: {
          id?: string
          display_name?: string | null
          role?: 'citizen' | 'government_user' | 'platform_admin'
          active_jurisdiction_id?: string | null
          created_at?: string
          updated_at?: string
          avatar_url?: string | null
          leaderboard_visible?: boolean
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
          role_in_jurisdiction: 'reviewer' | 'operator'
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          jurisdiction_id: string
          role_in_jurisdiction: 'reviewer' | 'operator'
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          jurisdiction_id?: string
          role_in_jurisdiction?: 'reviewer' | 'operator'
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      capture_sessions: {
        Relationships: []
        Row: {
          location_source: "live" | "demo"
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
          location_source: "live" | "demo"
          id: string
          citizen_id: string
          capture_session_id: string
          jurisdiction_id: string
          urgency: 'URGENT_HAZARD' | 'MAINTENANCE'
          description: string | null
          coordinates: unknown // PostGIS point
          accuracy_meters: number
          submitted_at: string
          status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ASSOCIATED_DUPLICATE'
          requires_manual_classification: boolean
          created_at: string
          updated_at: string
          evidence_quality_score: number | null
          evidence_quality_status: 'PENDING' | 'SCORED' | 'UNAVAILABLE'
          evidence_quality_notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
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
          status?: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ASSOCIATED_DUPLICATE'
          requires_manual_classification?: boolean
          created_at?: string
          updated_at?: string
          evidence_quality_score?: number | null
          evidence_quality_status?: 'PENDING' | 'SCORED' | 'UNAVAILABLE'
          evidence_quality_notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
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
          status?: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'ASSOCIATED_DUPLICATE'
          requires_manual_classification?: boolean
          created_at?: string
          updated_at?: string
          evidence_quality_score?: number | null
          evidence_quality_status?: 'PENDING' | 'SCORED' | 'UNAVAILABLE'
          evidence_quality_notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
      }
      incidents: {
        Relationships: []
        Row: {
          is_demo: boolean
          id: string
          jurisdiction_id: string
          primary_report_id: string
          category: string | null
          urgency: 'URGENT_HAZARD' | 'MAINTENANCE' | null
          workstream: string | null
          status: 'SUBMITTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED_RESOLVED' | 'FLAGGED_FOR_REREVIEW' | 'REJECTED'
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
          status?: 'SUBMITTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED_RESOLVED' | 'FLAGGED_FOR_REREVIEW' | 'REJECTED'
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
          status?: 'SUBMITTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED_RESOLVED' | 'FLAGGED_FOR_REREVIEW' | 'REJECTED'
          coordinates?: unknown
          created_at?: string
          accepted_at?: string | null
          sla_deadline?: string | null
          resolved_at?: string | null
          is_public?: boolean
        }
      }
      incident_events: {
        Relationships: []
        Row: {id:string;incident_id:string;event_type:string;actor_id:string;actor_role:string;payload:Json;created_at:string}
        Insert: {id?:string;incident_id:string;event_type:string;actor_id:string;actor_role:string;payload?:Json;created_at?:string}
        Update: {id?:string}
      }
      government_updates: {
        Relationships: []
        Row: {id:string;incident_id:string;author_id:string;body:string;update_type:'PROGRESS'|'RESOLUTION';created_at:string}
        Insert: {id?:string;incident_id:string;author_id:string;body:string;update_type?:'PROGRESS'|'RESOLUTION';created_at?:string}
        Update: {id?:string}
      }
      resolution_uploads: {
        Relationships: []
        Row: {id:string;incident_id:string;government_user_id:string;storage_path_private:string;storage_path_public:string;media_hash:string;created_at:string}
        Insert: {id:string;incident_id:string;government_user_id:string;storage_path_private:string;storage_path_public:string;media_hash:string;created_at?:string}
        Update: {id?:string}
      }
      contribution_ledger: {
        Relationships: []
        Row: {id:string;citizen_id:string;incident_id:string|null;event_type:string;points_delta:number;created_at:string}
        Insert: {id?:string;citizen_id:string;incident_id?:string|null;event_type:string;points_delta:number;created_at?:string}
        Update: {id?:string}
      }
      platform_admin_events: {
        Relationships: []
        Row: {id:string;actor_id:string;target_user_id:string;membership_id:string|null;event_type:'GOVERNMENT_USER_PROVISIONED'|'MEMBERSHIP_EDITED'|'ACCESS_ENABLED'|'ACCESS_DISABLED';payload:Json;created_at:string}
        Insert: {id?:string;actor_id:string;target_user_id:string;membership_id?:string|null;event_type:'GOVERNMENT_USER_PROVISIONED'|'MEMBERSHIP_EDITED'|'ACCESS_ENABLED'|'ACCESS_DISABLED';payload?:Json;created_at?:string}
        Update: {id?:string}
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
