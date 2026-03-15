import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Avatar, Button } from '../ui';
import { commentsAPI } from '../../lib/api';
import { spacing, fontSize, fontWeight, borderRadius } from '../../constants/styles';
import { useTheme } from '../../contexts/ThemeContext';

// Individual Comment Component
function CommentItem({ comment, currentUserId, onUpdate, onDelete }) {
  const { colors } = useTheme();
  const [isLiked, setIsLiked] = useState(comment.is_liked || false);
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [updating, setUpdating] = useState(false);

  const isOwnComment = comment.user?.id === currentUserId;

  const handleLike = async () => {
    try {
      if (isLiked) {
        await commentsAPI.unlike(comment.id);
        setIsLiked(false);
        setLikesCount((prev) => prev - 1);
      } else {
        await commentsAPI.like(comment.id);
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling comment like:', error);
    }
  };

  const handleEdit = async () => {
    if (!editText.trim()) {
      Alert.alert('Error', 'Comment cannot be empty');
      return;
    }

    try {
      setUpdating(true);
      await commentsAPI.update(comment.id, { content: editText });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating comment:', error);
      Alert.alert('Error', 'Failed to update comment');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await commentsAPI.delete(comment.id);
              onDelete(comment.id);
            } catch (error) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  return (
    <View style={[styles.commentItem, { borderBottomColor: colors.gray200 }]}>
      <Avatar user={comment.user} size="small" />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={[styles.commentUsername, { color: colors.textPrimary }]}>{comment.user?.name || 'Unknown'}</Text>
          <Text style={[styles.commentTime, { color: colors.textSecondary }]}>{formatTimeAgo(comment.created_at)}</Text>
        </View>

        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[styles.editInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.inputBackground }]}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              placeholderTextColor={colors.textSecondary}
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEdit}
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.commentText, { color: colors.textPrimary }]}>{comment.content}</Text>

            <View style={styles.commentActions}>
              <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
                <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                  {isLiked ? '❤️' : '🤍'} {likesCount > 0 && likesCount}
                </Text>
              </TouchableOpacity>

              {isOwnComment && (
                <>
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.actionButton}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// Main Comment Section Component
export default function CommentSection({ preferenceId, currentUser }) {
  const { colors } = useTheme();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    loadComments();
  }, [preferenceId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await commentsAPI.list(preferenceId);
      if (response.success) {
        setComments(response.data.comments || response.data || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    try {
      setSubmitting(true);
      const response = await commentsAPI.create(preferenceId, { content: newComment });
      if (response.success) {
        setNewComment('');
        setShowInput(false);
        loadComments();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      Alert.alert('Error', error.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerText, { color: colors.textPrimary }]}>Comments ({comments.length})</Text>
      </View>

      {/* Add Comment Button or Input */}
      {!showInput ? (
        <TouchableOpacity
          style={[styles.addCommentButton, { borderBottomColor: colors.border, backgroundColor: colors.gray100 }]}
          onPress={() => setShowInput(true)}
        >
          <Avatar user={currentUser} size="small" />
          <Text style={[styles.addCommentText, { color: colors.textSecondary }]}>Add a comment...</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
          <Avatar user={currentUser} size="small" />
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.inputBackground }]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textSecondary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              autoFocus
            />
            <View style={styles.inputActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowInput(false);
                  setNewComment('');
                }}
                style={styles.cancelInputButton}
              >
                <Text style={[styles.cancelInputText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!newComment.trim() || submitting}
                style={[
                  styles.postButton,
                  { backgroundColor: colors.primary },
                  (!newComment.trim() || submitting) && { backgroundColor: colors.gray300 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No comments yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Be the first to comment!</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              currentUserId={currentUser?.id}
              onUpdate={loadComments}
              onDelete={handleDeleteComment}
            />
          )}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  addCommentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  addCommentText: {
    fontSize: fontSize.md,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  inputWrapper: {
    flex: 1,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    maxHeight: 100,
  },
  postButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: {
    color: '#ffffff',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  cancelInputButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelInputText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  commentItem: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  commentUsername: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  commentTime: {
    fontSize: fontSize.xs,
  },
  commentText: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  commentActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    paddingVertical: spacing.xs,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  editContainer: {
    marginTop: spacing.xs,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSize.sm,
    color: '#ffffff',
    fontWeight: fontWeight.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
  },
});
