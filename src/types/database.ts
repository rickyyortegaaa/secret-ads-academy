export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      whitelist: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          position: number;
          type: "multiple_choice" | "written";
          text: string;
          image_url: string | null;
          time_seconds: number;
          options: { id: string; text: string }[] | null;
          correct_option_id: string | null;
          reference_answer: string | null;
          grading_rubric: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          position: number;
          type?: "multiple_choice" | "written";
          text: string;
          image_url?: string | null;
          time_seconds?: number;
          options?: { id: string; text: string }[] | null;
          correct_option_id?: string | null;
          reference_answer?: string | null;
          grading_rubric?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          position?: number;
          type?: "multiple_choice" | "written";
          text?: string;
          image_url?: string | null;
          time_seconds?: number;
          options?: { id: string; text: string }[] | null;
          correct_option_id?: string | null;
          reference_answer?: string | null;
          grading_rubric?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attempts: {
        Row: {
          id: string;
          student_id: string;
          started_at: string;
          finished_at: string | null;
          score: number | null;
          passed: boolean | null;
          results_published: boolean;
          tab_switches: number;
          question_order: string[];
        };
        Insert: {
          id?: string;
          student_id: string;
          started_at?: string;
          finished_at?: string | null;
          score?: number | null;
          passed?: boolean | null;
          results_published?: boolean;
          tab_switches?: number;
          question_order: string[];
        };
        Update: {
          id?: string;
          student_id?: string;
          started_at?: string;
          finished_at?: string | null;
          score?: number | null;
          passed?: boolean | null;
          results_published?: boolean;
          tab_switches?: number;
          question_order?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option_id: string | null;
          text_answer: string | null;
          is_correct: boolean | null;
          ai_score: number | null;
          ai_feedback: string | null;
          time_taken_ms: number | null;
          answered_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_option_id?: string | null;
          text_answer?: string | null;
          is_correct?: boolean | null;
          ai_score?: number | null;
          ai_feedback?: string | null;
          time_taken_ms?: number | null;
          answered_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string;
          selected_option_id?: string | null;
          text_answer?: string | null;
          is_correct?: boolean | null;
          ai_score?: number | null;
          ai_feedback?: string | null;
          time_taken_ms?: number | null;
          answered_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          id: string;
          pass_threshold: number;
          publish_results_globally: boolean;
          allow_retries: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pass_threshold?: number;
          publish_results_globally?: boolean;
          allow_retries?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pass_threshold?: number;
          publish_results_globally?: boolean;
          allow_retries?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
