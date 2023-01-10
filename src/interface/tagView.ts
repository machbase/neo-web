export interface Board {
    board_id: string;
    board_name: string;
    last_edit: string;
}

// Res
export interface ResBoardList {
    msg: string;
    list: Board[];
    success: boolean;
}
