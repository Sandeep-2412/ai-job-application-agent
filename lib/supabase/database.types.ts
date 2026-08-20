export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          user_id: string
          platform: string
          title: string
          company: string
          company_logo: string | null
          location: string | null
          salary: string | null
          job_type: string | null
          experience_level: string | null
          description: string | null
          tags: Json
          match_score: number
          job_url: string
          source_url: string | null
          posted_at: string | null
          applied_status: boolean
          saved_status: boolean
          fetched_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          title: string
          company: string
          company_logo?: string | null
          location?: string | null
          salary?: string | null
          job_type?: string | null
          experience_level?: string | null
          description?: string | null
          tags?: Json
          match_score?: number
          job_url: string
          source_url?: string | null
          posted_at?: string | null
          applied_status?: boolean
          saved_status?: boolean
          fetched_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          title?: string
          company?: string
          company_logo?: string | null
          location?: string | null
          salary?: string | null
          job_type?: string | null
          experience_level?: string | null
          description?: string | null
          tags?: Json
          match_score?: number
          job_url?: string
          source_url?: string | null
          posted_at?: string | null
          applied_status?: boolean
          saved_status?: boolean
          fetched_at?: string
          created_at?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          application_url: string | null
          applied_at: string | null
          company_name: string
          created_at: string
          id: string
          job_title: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_url?: string | null
          applied_at?: string | null
          company_name: string
          created_at?: string
          id?: string
          job_title: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_url?: string | null
          applied_at?: string | null
          company_name?: string
          created_at?: string
          id?: string
          job_title?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          profile_data: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          profile_data?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          profile_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      user_resumes: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          parsed_resume_data: Json | null
          public_url: string | null
          storage_path: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          parsed_resume_data?: Json | null
          public_url?: string | null
          storage_path: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          parsed_resume_data?: Json | null
          public_url?: string | null
          storage_path?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
