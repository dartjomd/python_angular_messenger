export type ChatType = 'direct' | 'group'; // или капсом, в зависимости от того, что выберешь на бэкенде

export interface CompanionMetadata {
    id: number;
    username: string;
    is_online: boolean;
    last_seen: string | null;
    avatar_letter: string; // Забираем сгенерированную Pydantic букву!
}

export interface GroupMetadata {
    members_count: number;
    online_count: number;
}

export interface ChatMetadata {
    chat_id: number;
    chat_type: ChatType;
    title: string;
    avatar_letter: string;
    direct_info: CompanionMetadata | null;
    group_info: GroupMetadata | null;
}