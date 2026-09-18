import type { Role } from './auth';

export type PostCategory =
  | 'general'
  | 'crop_advice'
  | 'pest_control'
  | 'market_talk'
  | 'equipment';

export type ReactionType =
  | 'like'
  | 'celebrate'
  | 'support'
  | 'love'
  | 'insight'
  | 'funny';

export interface PostReaction {
  userId: string;
  userName: string;
  userRole?: Role;
  userPhotoUrl?: string;
  type: ReactionType;
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  authorPhotoUrl?: string;
  title: string;
  body: string;
  category: PostCategory;
  imageUrl?: string;
  videoUrl?: string;
  upvotes: number;
  reactions?: PostReaction[];
  reactionCounts?: Record<ReactionType, number>;
  totalReactions?: number;
  commentsCount: number;
  isFlagged: boolean;
  isRemoved: boolean;
  createdAt: string;
  updatedAt: string;
  isUpvotedByMe?: boolean;
  myReaction?: ReactionType;
  sharedPostId?: string;
  sharedPost?: Post;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  authorPhotoUrl?: string;
  body: string;
  isFlagged: boolean;
  isRemoved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostPayload {
  title?: string;
  body: string;
  category: PostCategory;
  imageUrl?: string;
  videoUrl?: string;
  sharedPostId?: string;
}

export interface UpdatePostPayload {
  title?: string;
  body: string;
  category: PostCategory;
  imageUrl?: string;
  videoUrl?: string;
}

export interface CreateCommentPayload {
  body: string;
}
