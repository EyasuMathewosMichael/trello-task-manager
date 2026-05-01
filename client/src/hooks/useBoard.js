import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

/**
 * Custom hook for managing board state.
 * Fetches boards on mount and provides CRUD operations.
 */
export function useBoard() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/boards');
      setBoards(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load boards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  /**
   * Create a new board with the given name.
   * @param {string} name
   * @returns {Promise<object>} The created board
   */
  const createBoard = useCallback(async (name) => {
    const response = await api.post('/boards', { name });
    const newBoard = response.data;
    setBoards((prev) => [...prev, newBoard]);
    return newBoard;
  }, []);

  /**
   * Update a board's name.
   * @param {string} boardId
   * @param {string} name
   * @returns {Promise<object>} The updated board
   */
  const updateBoard = useCallback(async (boardId, name) => {
    const response = await api.put(`/boards/${boardId}`, { name });
    const updatedBoard = response.data;
    setBoards((prev) =>
      prev.map((b) => (b._id === boardId ? updatedBoard : b))
    );
    return updatedBoard;
  }, []);

  /**
   * Delete a board by ID.
   * @param {string} boardId
   */
  const deleteBoard = useCallback(async (boardId) => {
    await api.delete(`/boards/${boardId}`);
    setBoards((prev) => prev.filter((b) => b._id !== boardId));
  }, []);

  return {
    boards,
    loading,
    error,
    createBoard,
    updateBoard,
    deleteBoard,
    refetch: fetchBoards,
  };
}

export default useBoard;
