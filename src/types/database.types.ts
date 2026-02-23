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
            games: {
                Row: {
                    id: string
                    name: string
                    join_code: string
                    status: string
                    admin_id: string
                    settings: Json
                    timer_state: Json
                    score_a: number
                    score_b: number
                    created_at: string
                }
                Insert: {
                    id: string
                    name: string
                    join_code: string
                    status?: string
                    admin_id: string
                    settings?: Json
                    timer_state?: Json
                    score_a?: number
                    score_b?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    join_code?: string
                    status?: string
                    admin_id?: string
                    settings?: Json
                    timer_state?: Json
                    score_a?: number
                    score_b?: number
                    created_at?: string
                }
            }
            players: {
                Row: {
                    id: string
                    name: string
                    is_confirmed: boolean
                    is_goalkeeper: boolean
                    game_id: string
                    created_at: string
                }
                Insert: {
                    id: string
                    name: string
                    is_confirmed?: boolean
                    is_goalkeeper?: boolean
                    game_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    is_confirmed?: boolean
                    is_goalkeeper?: boolean
                    game_id?: string
                    created_at?: string
                }
            }
            queue_state: {
                Row: {
                    game_id: string
                    team_a: string[]
                    team_b: string[]
                    next_block: string[]
                    re_queue: string[]
                    updated_at: string
                }
                Insert: {
                    game_id: string
                    team_a?: string[]
                    team_b?: string[]
                    next_block?: string[]
                    re_queue?: string[]
                    updated_at?: string
                }
                Update: {
                    game_id?: string
                    team_a?: string[]
                    team_b?: string[]
                    next_block?: string[]
                    re_queue?: string[]
                    updated_at?: string
                }
            }
        }
    }
}
