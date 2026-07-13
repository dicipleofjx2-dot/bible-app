import { supabase } from '@/lib/supabase';

export type Room = {
  id: string;
  name: string;
  planId: string;
  planTitle: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
};

export type RoomActivityEntry = {
  id: string;
  roomId: string;
  userId: string;
  author: string;
  dayNumber: number;
  bookId: number;
  chapter: number;
  createdAt: string;
};

export type RoomMessage = {
  id: string;
  roomId: string;
  userId: string;
  author: string;
  body: string;
  createdAt: string;
};

export type RoomMember = {
  userId: string;
  username: string;
};

export type Profile = {
  id: string;
  username: string;
};

function mapRoomRow(row: any): Room {
  return {
    id: row.id,
    name: row.name,
    planId: row.plan_id,
    planTitle: row.reading_plans?.title ?? '',
    ownerId: row.owner_id,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
  };
}

export async function createRoom(
  name: string,
  planId: string,
  ownerId: string,
  inviteCode: string
): Promise<Room> {
  const { data, error } = await supabase
    .from('reading_rooms')
    .insert({ name, plan_id: planId, owner_id: ownerId, invite_code: inviteCode.trim().toUpperCase() })
    .select('id, name, plan_id, owner_id, invite_code, created_at, reading_plans(title)')
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 사용 중인 참여 코드입니다. 다른 코드를 입력해주세요.');
    }
    throw error;
  }
  return mapRoomRow(data);
}

export async function getMyRooms(userId: string): Promise<Room[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select(
      'reading_rooms(id, name, plan_id, owner_id, invite_code, created_at, reading_plans(title))'
    )
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? [])
    .map((row: any) => row.reading_rooms)
    .filter(Boolean)
    .map(mapRoomRow);
}

/** Every room in the app, newest first — lets a member-less user browse and
 * join without needing an invite code. Rooms are readable by any signed-in
 * user (see RLS policy), so this doesn't leak anything the API wasn't already
 * exposing via getRoomByInviteCode. */
export async function getAllRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from('reading_rooms')
    .select('id, name, plan_id, owner_id, invite_code, created_at, reading_plans(title)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapRoomRow);
}

export async function getRoomByInviteCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('reading_rooms')
    .select('id, name, plan_id, owner_id, invite_code, created_at, reading_plans(title)')
    .eq('invite_code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data ? mapRoomRow(data) : null;
}

/** Set `notifyOnJoin` when the room owner adds someone directly (not a
 * self-join via invite code), so getPendingRoomInvites() surfaces it to
 * them next time they open the app. */
export async function joinRoom(
  roomId: string,
  userId: string,
  options?: { notifyOnJoin?: boolean }
): Promise<void> {
  const { error } = await supabase.from('room_members').upsert(
    {
      room_id: roomId,
      user_id: userId,
      notified_at: options?.notifyOnJoin ? null : new Date().toISOString(),
    },
    { onConflict: 'room_id,user_id', ignoreDuplicates: true }
  );
  if (error) throw error;
}

export async function getRoomDetail(roomId: string): Promise<{ room: Room; memberCount: number } | null> {
  const [{ data: room, error: roomError }, { count, error: countError }] = await Promise.all([
    supabase
      .from('reading_rooms')
      .select('id, name, plan_id, owner_id, invite_code, created_at, reading_plans(title)')
      .eq('id', roomId)
      .maybeSingle(),
    supabase.from('room_members').select('id', { count: 'exact', head: true }).eq('room_id', roomId),
  ]);
  if (roomError) throw roomError;
  if (countError) throw countError;
  if (!room) return null;
  return { room: mapRoomRow(room), memberCount: count ?? 0 };
}

export async function getRoomActivity(roomId: string): Promise<RoomActivityEntry[]> {
  const { data, error } = await supabase
    .from('room_activity')
    .select('id, room_id, user_id, day_number, book_id, chapter, created_at, profiles(username)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    author: row.profiles?.username ?? '익명',
    dayNumber: row.day_number,
    bookId: row.book_id,
    chapter: row.chapter,
    createdAt: row.created_at,
  }));
}

export async function postRoomActivity(
  roomId: string,
  userId: string,
  dayNumber: number,
  bookId: number,
  chapter: number
): Promise<void> {
  const { error } = await supabase.from('room_activity').upsert(
    { room_id: roomId, user_id: userId, day_number: dayNumber, book_id: bookId, chapter },
    { onConflict: 'room_id,user_id,day_number', ignoreDuplicates: true }
  );
  if (error) throw error;
}

/** Rooms the user belongs to that are tied to the given reading plan — used to
 * auto-post activity when they complete a day of that plan. */
export async function getRoomsForPlan(userId: string, planId: string): Promise<Room[]> {
  const rooms = await getMyRooms(userId);
  return rooms.filter((r) => r.planId === planId);
}

export async function getRoomMessages(roomId: string): Promise<RoomMessage[]> {
  const { data, error } = await supabase
    .from('room_messages')
    .select('id, room_id, user_id, body, created_at, profiles(username)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    author: row.profiles?.username ?? '익명',
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function postRoomMessage(roomId: string, userId: string, body: string): Promise<void> {
  const { error } = await supabase.from('room_messages').insert({ room_id: roomId, user_id: userId, body });
  if (error) throw error;
}

export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select('user_id, profiles(username)')
    .eq('room_id', roomId);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    username: row.profiles?.username ?? '익명',
  }));
}

/** Every app user — used by the room owner to pick someone to invite
 * directly, without needing to share the invite code. */
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('id, username').order('username');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ id: row.id, username: row.username ?? '익명' }));
}

/** Deletes a room outright — only the owner passes the RLS check. Members,
 * activity, and chat history cascade-delete with it. */
export async function deleteRoom(roomId: string): Promise<void> {
  const { error } = await supabase.from('reading_rooms').delete().eq('id', roomId);
  if (error) throw error;
}

export type PendingRoomInvite = {
  roomId: string;
  roomName: string;
  planTitle: string;
};

/** Rooms this user was added to directly by the owner and hasn't seen yet. */
export async function getPendingRoomInvites(userId: string): Promise<PendingRoomInvite[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select('room_id, reading_rooms(name, reading_plans(title))')
    .eq('user_id', userId)
    .is('notified_at', null);
  if (error) throw error;
  return (data ?? [])
    .filter((row: any) => row.reading_rooms)
    .map((row: any) => ({
      roomId: row.room_id,
      roomName: row.reading_rooms.name,
      planTitle: row.reading_rooms.reading_plans?.title ?? '',
    }));
}

export async function markRoomInviteNotified(roomId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('room_members')
    .update({ notified_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', userId);
  if (error) throw error;
}
